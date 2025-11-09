import type { Session, User } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

import {
  Filter,
  InsertPayload,
  SelectPayload,
  SupabaseRpcRequest,
  UpdatePayload,
  withUsersJoin,
} from './db';
import { MockSession, MockUser, TableName, findUserByEmail, getDatabase, resetSupabaseState } from './state';

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT';

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: { message: string } | null;
}

interface SignUpResponse extends AuthResponse {}

interface SignInWithPasswordArgs {
  email: string;
  password: string;
}

interface SignUpArgs {
  email: string;
  password: string;
}

interface UpsertOptions {
  returning?: 'minimal' | 'representation';
}

interface DeletePayloadWithOperation {
  operation: 'delete';
  table: TableName;
  filters: Filter[];
}

interface UpdatePayloadWithOperation extends UpdatePayload {
  operation: 'update';
  table: TableName;
}

interface SelectPayloadWithOperation extends SelectPayload {
  operation: 'select';
}

interface InsertPayloadWithOperation extends InsertPayload {
  operation: 'insert';
}

type RpcPayload =
  | SelectPayloadWithOperation
  | InsertPayloadWithOperation
  | UpdatePayloadWithOperation
  | DeletePayloadWithOperation;

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

const buildSupabaseUser = (user: MockUser): User => ({
  id: user.id,
  email: user.email,
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  app_metadata: {
    provider: 'email',
  },
  user_metadata: {
    name: user.name,
    role: user.role,
  },
  identities: [],
  created_at: user.created_at ?? new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  role: user.role,
  aud: 'authenticated',
  confirmed_at: new Date().toISOString(),
  phone_confirmed_at: null,
  factors: null,
});

const buildSupabaseSession = (session: MockSession, user: MockUser): Session => ({
  access_token: session.access_token,
  expires_in: 60 * 60,
  refresh_token: session.access_token,
  token_type: 'bearer',
  user: buildSupabaseUser(user),
  expires_at: session.expires_at,
  provider_token: null,
  provider_refresh_token: null,
});

const BASE_URL = '/__supabase__';

const rpc = async <T>(payload: RpcPayload, token: string | null): Promise<T> => {
  const response = await fetch(`${BASE_URL}/rpc`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (json.error) {
    return json;
  }
  return json;
};

const authListeners = new Set<AuthListener>();

let currentUser: MockUser | null = null;
let currentSession: Session | null = null;
let queryClient: QueryClient | null = null;

const notifyAuthListeners = (event: AuthChangeEvent) => {
  for (const listener of authListeners) {
    listener(event, currentSession);
  }
};

const syncQueryCache = () => {
  if (!queryClient) return;
  const db = getDatabase();

  queryClient.setQueryData(['denuncias', 'list'], db.denuncias.map((denuncia) => ({ ...denuncia })));

  db.denuncias.forEach((denuncia) => {
    queryClient.setQueryData(['denuncias', 'detail', denuncia.id], { ...denuncia });

    const comentarios = db.comentarios.filter((comentario) => comentario.denuncia_id === denuncia.id);
    queryClient.setQueryData(
      ['comentarios', 'byDenuncia', denuncia.id],
      withUsersJoin(comentarios).map((comentario) => ({ ...comentario }))
    );

    const likes = db.likes.filter((like) => like.denuncia_id === denuncia.id);
    queryClient.setQueryData(['likes', 'byDenuncia', denuncia.id], likes.map((like) => ({ ...like })));
  });

  if (currentSession) {
    const userId = currentSession.user.id;
    const likesByUser = db.likes.filter((like) => like.user_id === userId).map((like) => ({ ...like }));
    queryClient.setQueryData(['likes', 'byUser', userId], likesByUser);
  }
};

const executeRpc = async (payload: RpcPayload) => {
  const token = currentSession?.access_token ?? null;
  const result = await rpc(payload, token);
  if (!('error' in result) || result.error === null) {
    syncQueryCache();
  }
  return result;
};

class SupabaseQueryBuilder {
  private filters: Filter[] = [];
  private orderConfig?: { column: string; ascending: boolean };
  private selectPayload?: Omit<SelectPayloadWithOperation, 'operation' | 'filters' | 'order' | 'table'>;
  private updateValues?: Record<string, unknown>;
  private operation: 'select' | 'update' | 'delete' | null = null;
  private executed = false;
  private promise: Promise<any> | null = null;

  constructor(private table: TableName) {}

  select(columns = '*', options?: SelectPayload['options']) {
    this.operation = 'select';
    this.selectPayload = { columns, options };
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[], options?: UpsertOptions) {
    const payload: InsertPayloadWithOperation = {
      operation: 'insert',
      table: this.table,
      values: Array.isArray(values) ? values : [values],
    };
    return executeRpc(payload);
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update';
    this.updateValues = values;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: 'eq', column: column as any, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: 'in', column: column as any, values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = { column, ascending: options?.ascending ?? true };
    return this;
  }

  single() {
    if (!this.selectPayload) {
      throw new Error('single() can only be used after select()');
    }
    this.selectPayload.single = true;
    return this.execute();
  }

  maybeSingle() {
    if (!this.selectPayload) {
      throw new Error('maybeSingle() can only be used after select()');
    }
    this.selectPayload.maybeSingle = true;
    return this.execute();
  }

  private execute() {
    if (this.promise) {
      return this.promise;
    }

    if (this.operation === 'select') {
      if (!this.selectPayload) {
        throw new Error('select() must be called before executing');
      }
      const payload: SelectPayloadWithOperation = {
        operation: 'select',
        table: this.table,
        filters: this.filters,
        order: this.orderConfig,
        columns: this.selectPayload.columns,
        options: this.selectPayload.options,
        single: this.selectPayload.single,
        maybeSingle: this.selectPayload.maybeSingle,
      };
      this.promise = executeRpc(payload);
    } else if (this.operation === 'update') {
      if (!this.updateValues) {
        throw new Error('update() requires values');
      }
      const payload: UpdatePayloadWithOperation = {
        operation: 'update',
        table: this.table,
        filters: this.filters,
        order: this.orderConfig,
        values: this.updateValues,
      };
      this.promise = executeRpc(payload);
    } else if (this.operation === 'delete') {
      const payload: DeletePayloadWithOperation = {
        operation: 'delete',
        table: this.table,
        filters: this.filters,
        order: this.orderConfig,
      };
      this.promise = executeRpc(payload);
    } else {
      throw new Error('No operation specified');
    }

    this.executed = true;
    return this.promise;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ) {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | undefined | null) {
    return this.execute().finally(onfinally);
  }
}

const signInWithPassword = async ({ email, password }: SignInWithPasswordArgs): Promise<AuthResponse> => {
  const response = await fetch(`${BASE_URL}/auth/sign-in`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json();

  if (json.error) {
    return { data: { user: null, session: null }, error: { message: json.error.message } };
  }

  const user = findUserByEmail(email);
  if (!user) {
    return { data: { user: null, session: null }, error: { message: 'User not found' } };
  }

  currentUser = user;
  const session = buildSupabaseSession(json.data.session, user);
  currentSession = session;
  notifyAuthListeners('SIGNED_IN');
  syncQueryCache();

  return {
    data: {
      user: session.user,
      session,
    },
    error: null,
  };
};

const signUp = async ({ email, password }: SignUpArgs): Promise<SignUpResponse> => {
  const response = await fetch(`${BASE_URL}/auth/sign-up`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json();

  if (json.error) {
    return { data: { user: null, session: null }, error: { message: json.error.message } };
  }

  const user = findUserByEmail(email);
  if (!user) {
    return { data: { user: null, session: null }, error: { message: 'User not found after sign-up' } };
  }

  currentUser = user;
  const session = buildSupabaseSession(json.data.session, user);
  currentSession = session;
  notifyAuthListeners('SIGNED_IN');
  syncQueryCache();

  return {
    data: {
      user: session.user,
      session,
    },
    error: null,
  };
};

const signOut = async () => {
  if (!currentSession) {
    return { error: null };
  }

  await fetch(`${BASE_URL}/auth/sign-out`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      Authorization: `Bearer ${currentSession.access_token}`,
    },
  });

  currentSession = null;
  currentUser = null;
  notifyAuthListeners('SIGNED_OUT');
  syncQueryCache();

  return { error: null };
};

const getSession = async () => ({
  data: {
    session: currentSession,
  },
  error: null,
});

const onAuthStateChange = (callback: AuthListener) => {
  authListeners.add(callback);
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          authListeners.delete(callback);
        },
      },
    },
    error: null,
  };
};

const from = (table: TableName) => new SupabaseQueryBuilder(table);

export const supabase = {
  auth: {
    signInWithPassword,
    signUp,
    signOut,
    getSession,
    onAuthStateChange,
  },
  from,
};

export const __setMockQueryClient = (client: QueryClient | null) => {
  queryClient = client;
  syncQueryCache();
};

export const __resetSupabaseMock = async () => {
  resetSupabaseState();
  currentSession = null;
  currentUser = null;
  authListeners.clear();
  queryClient = null;
};

