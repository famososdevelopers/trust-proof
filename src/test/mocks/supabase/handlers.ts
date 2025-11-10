import { http, HttpResponse } from 'msw';

import {
  DeletePayload,
  InsertPayload,
  SelectPayload,
  SupabaseRpcRequest,
  UpdatePayload,
  runDelete,
  runInsert,
  runSelect,
  runUpdate,
} from './db';
import {
  ComentarioRow,
  DenunciaRow,
  LikeRow,
  MockSession,
  MockUser,
  createSessionForUser,
  deleteSession,
  findUserByEmail,
  findUserById,
  getDatabase,
  getSessionByToken,
  resetSupabaseState,
  sanitizeUser,
  setDatabase,
} from './state';

const notAuthenticated = () =>
  HttpResponse.json(
    {
      data: null,
      error: { message: 'Auth session missing' },
    },
    { status: 401 }
  );

const forbidden = () =>
  HttpResponse.json(
    {
      data: null,
      error: { message: 'Operation not permitted' },
    },
    { status: 403 }
  );

const validateAuth = (request: Request): MockSession | null => {
  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;
  return getSessionByToken(token);
};

const assertOwnership = (session: MockSession, resourceUserId: string) =>
  session.user_id === resourceUserId;

const isAdmin = (session: MockSession): boolean => {
  const user = findUserById(session.user_id);
  return user?.role === 'admin';
};

const handleSelect = (session: MockSession | null, payload: SelectPayload) => {
  if (!session) {
    return notAuthenticated();
  }
  const result = runSelect(payload);
  return HttpResponse.json(result);
};

const handleInsert = (session: MockSession | null, payload: InsertPayload) => {
  if (!session) {
    return notAuthenticated();
  }

  if (payload.table === 'denuncias') {
    const invalid = payload.values.some((value) => value.user_id !== session.user_id);
    if (invalid) {
      return forbidden();
    }
  }

  if (payload.table === 'comentarios') {
    const invalid = payload.values.some((value) => value.user_id !== session.user_id);
    if (invalid) {
      return forbidden();
    }
  }

  if (payload.table === 'likes') {
    const invalid = payload.values.some((value) => value.user_id !== session.user_id);
    if (invalid) {
      return forbidden();
    }
  }

  if (payload.table === 'moderaciones' && !isAdmin(session)) {
    return forbidden();
  }

  const result = runInsert(payload);
  return HttpResponse.json(result);
};

const handleUpdate = (session: MockSession | null, payload: UpdatePayload) => {
  if (!session) {
    return notAuthenticated();
  }

  if (payload.table === 'denuncias') {
    const db = getDatabase();
    const target = db.denuncias.filter((denuncia) =>
      payload.filters.every((filter) => {
        if (filter.type === 'eq') {
          return denuncia[filter.column as keyof typeof denuncia] === filter.value;
        }
        if (filter.type === 'in') {
          return (filter.values as unknown[]).includes(denuncia[filter.column as keyof typeof denuncia]);
        }
        return true;
      })
    );

    const attemptingModeration = Object.prototype.hasOwnProperty.call(payload.values, 'estado');

    const isOwnerUpdate = target.every((denuncia) => assertOwnership(session, denuncia.user_id));

    if (!isOwnerUpdate && (!attemptingModeration || !isAdmin(session))) {
      return forbidden();
    }
  }

  const result = runUpdate(payload);
  return HttpResponse.json(result);
};

const handleDelete = (session: MockSession | null, payload: DeletePayload) => {
  if (!session) {
    return notAuthenticated();
  }

  if (payload.table === 'comentarios') {
    const db = getDatabase();
    const canDelete = db.comentarios
      .filter((comentario) =>
        payload.filters.every((filter) => filter.type === 'eq' && comentario[filter.column as keyof ComentarioRow] === filter.value)
      )
      .every((comentario) => assertOwnership(session, comentario.user_id));
    if (!canDelete) {
      return forbidden();
    }
  }

  if (payload.table === 'likes') {
    const db = getDatabase();
    const canDelete = db.likes
      .filter((like) =>
        payload.filters.every((filter) => filter.type === 'eq' && like[filter.column as keyof LikeRow] === filter.value)
      )
      .every((like) => assertOwnership(session, like.user_id));
    if (!canDelete) {
      return forbidden();
    }
  }

  if (payload.table === 'denuncias') {
    const db = getDatabase();
    const canDelete = db.denuncias
      .filter((denuncia) =>
        payload.filters.every((filter) => filter.type === 'eq' && denuncia[filter.column as keyof DenunciaRow] === filter.value)
      )
      .every((denuncia) => assertOwnership(session, denuncia.user_id) || isAdmin(session));
    if (!canDelete) {
      return forbidden();
    }
  }

  const result = runDelete(payload);
  return HttpResponse.json(result);
};

export const handlers = [
  http.post('/__supabase__/auth/sign-in', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = findUserByEmail(email);

    if (!user || user.password !== password) {
      return HttpResponse.json(
        {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        },
        { status: 400 }
      );
    }

    const session = createSessionForUser(user.id);

    return HttpResponse.json({
      data: {
        user: sanitizeUser(user),
        session,
      },
      error: null,
    });
  }),

  http.post('/__supabase__/auth/sign-up', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const db = getDatabase();

    if (findUserByEmail(email)) {
      return HttpResponse.json(
        {
          data: { user: null, session: null },
          error: { message: 'User already registered' },
        },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    const user: MockUser = {
      id,
      email,
      name: email.split('@')[0],
      role: 'user',
      created_at,
      rut: null,
      password,
    };

    db.users.push(user);
    setDatabase(db);

    const session = createSessionForUser(id);

    return HttpResponse.json({
      data: {
        user: sanitizeUser(user),
        session,
      },
      error: null,
    });
  }),

  http.post('/__supabase__/auth/sign-out', async ({ request }) => {
    const session = validateAuth(request);
    if (!session) {
      return notAuthenticated();
    }

    deleteSession(session.access_token);
    return HttpResponse.json({ data: null, error: null });
  }),

  http.post('/__supabase__/rpc', async ({ request }) => {
    const payload = (await request.json()) as SupabaseRpcRequest;
    const session = validateAuth(request);

    switch (payload.operation) {
      case 'select':
        return handleSelect(session, payload);
      case 'insert':
        return handleInsert(session, payload);
      case 'update':
        return handleUpdate(session, payload);
      case 'delete':
        return handleDelete(session, payload);
      default:
        return HttpResponse.json(
          { data: null, error: { message: 'Unknown operation' } },
          { status: 400 }
        );
    }
  }),

  http.post('/__supabase__/testing/reset', async () => {
    resetSupabaseState();
    return HttpResponse.json({ ok: true });
  }),
];

