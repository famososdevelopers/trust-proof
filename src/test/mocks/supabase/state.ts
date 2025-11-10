import { Tables } from '@/integrations/supabase/types';

export type TableName = 'denuncias' | 'comentarios' | 'likes' | 'moderaciones' | 'users';

export type DenunciaRow = Tables<'denuncias'>;
export type ComentarioRow = Tables<'comentarios'>;
export type LikeRow = Tables<'likes'>;
export type ModeracionRow = Tables<'moderaciones'>;
export type UserRow = Tables<'users'>;

export interface MockUser extends UserRow {
  password: string;
  role: NonNullable<UserRow['role']>;
}

export interface MockDatabase {
  denuncias: DenunciaRow[];
  comentarios: ComentarioRow[];
  likes: LikeRow[];
  moderaciones: ModeracionRow[];
  users: MockUser[];
}

export interface MockSession {
  access_token: string;
  user_id: string;
  expires_at: number;
}

export interface SupabaseAuthState {
  currentSession: MockSession | null;
  sessions: Map<string, MockSession>;
}

const createIso = () => new Date().toISOString();

const initialDatabase = (): MockDatabase => {
  const now = createIso();
  const user1Id = 'user-1';
  const user2Id = 'user-2';
  const adminId = 'admin-1';
  const denuncia1Id = 'denuncia-1';
  const denuncia2Id = 'denuncia-2';
  const comentario1Id = 'comentario-1';
  const comentario2Id = 'comentario-2';
  const like1Id = 'like-1';

  return {
    users: [
      {
        id: user1Id,
        email: 'user@example.com',
        name: 'Usuario Uno',
        role: 'user',
        rut: null,
        created_at: now,
        password: 'password',
      },
      {
        id: user2Id,
        email: 'maria@example.com',
        name: 'María',
        role: 'user',
        rut: null,
        created_at: now,
        password: 'password',
      },
      {
        id: adminId,
        email: 'admin@example.com',
        name: 'Administrador',
        role: 'admin',
        rut: null,
        created_at: now,
        password: 'password',
      },
    ],
    denuncias: [
      {
        id: denuncia1Id,
        user_id: user1Id,
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@xyz.com',
        descripcion: 'Incumplimiento de contrato en la entrega de servicios.',
        estado: 'activa',
        likes_count: 1,
        comentarios_count: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: denuncia2Id,
        user_id: user2Id,
        nombre_asociado: 'Juan Pérez',
        mail_asociado: null,
        descripcion: 'Estafa en compraventa de vehículo usado.',
        estado: 'en revisión',
        likes_count: 0,
        comentarios_count: 1,
        created_at: now,
        updated_at: now,
      },
    ],
    comentarios: [
      {
        id: comentario1Id,
        denuncia_id: denuncia1Id,
        user_id: user2Id,
        contenido: 'Tuve una experiencia similar con esta empresa.',
        created_at: now,
      },
      {
        id: comentario2Id,
        denuncia_id: denuncia2Id,
        user_id: user1Id,
        contenido: 'Gracias por compartir la información.',
        created_at: now,
      },
    ],
    likes: [
      {
        id: like1Id,
        denuncia_id: denuncia1Id,
        user_id: user2Id,
        created_at: now,
      },
    ],
    moderaciones: [],
  };
};

let database: MockDatabase = initialDatabase();

const initialAuthState = (): SupabaseAuthState => ({
  currentSession: null,
  sessions: new Map(),
});

let authState: SupabaseAuthState = initialAuthState();

export const getDatabase = () => database;

export const setDatabase = (next: MockDatabase) => {
  database = next;
};

export const resetDatabase = () => {
  database = initialDatabase();
};

export const getAuthState = () => authState;

export const setAuthState = (next: SupabaseAuthState) => {
  authState = next;
};

export const resetAuthState = () => {
  authState = initialAuthState();
};

export const resetSupabaseState = () => {
  resetDatabase();
  resetAuthState();
};

export const findUserByEmail = (email: string) =>
  database.users.find((user) => user.email.toLowerCase() === email.toLowerCase());

export const findUserById = (id: string) => database.users.find((user) => user.id === id);

export const sanitizeUser = (user: MockUser): UserRow => {
  const { password: _password, ...rest } = user;
  return rest;
};

export const createSessionForUser = (userId: string): MockSession => {
  const access_token = crypto.randomUUID();
  const expires_at = Math.floor(Date.now() / 1000) + 60 * 60;
  const session: MockSession = {
    access_token,
    user_id: userId,
    expires_at,
  };
  authState.sessions.set(access_token, session);
  authState.currentSession = session;
  return session;
};

export const deleteSession = (token: string) => {
  authState.sessions.delete(token);
  if (authState.currentSession?.access_token === token) {
    authState.currentSession = null;
  }
};

export const getSessionByToken = (token: string | null | undefined) =>
  token ? authState.sessions.get(token) ?? null : null;


