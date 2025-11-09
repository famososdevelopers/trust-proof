import {
  ComentarioRow,
  DenunciaRow,
  LikeRow,
  ModeracionRow,
  MockDatabase,
  MockUser,
  TableName,
  getDatabase,
  setDatabase,
} from './state';

export type Filter =
  | { type: 'eq'; column: keyof DenunciaRow | keyof ComentarioRow | keyof LikeRow | keyof ModeracionRow | keyof MockUser; value: unknown }
  | { type: 'in'; column: keyof DenunciaRow; values: unknown[] };

export interface QueryPayload {
  table: TableName;
  filters: Filter[];
  order?: {
    column: string;
    ascending: boolean;
  };
}

export interface SelectPayload extends QueryPayload {
  columns: string;
  options?: {
    count?: 'exact' | null;
  };
  single?: boolean;
  maybeSingle?: boolean;
}

export interface InsertPayload {
  table: TableName;
  values: Record<string, unknown>[];
}

export interface UpdatePayload extends QueryPayload {
  values: Record<string, unknown>;
}

export interface DeletePayload extends QueryPayload {}

export type SupabaseRpcRequest =
  | ({ operation: 'select' } & SelectPayload)
  | ({ operation: 'insert' } & InsertPayload)
  | ({ operation: 'update' } & UpdatePayload)
  | ({ operation: 'delete' } & DeletePayload);

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
  count?: number | null;
}

const cloneDeep = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const applyFilters = <T extends Record<string, any>>(rows: T[], filters: Filter[]): T[] => {
  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.type === 'eq') {
        return row[filter.column as keyof T] === filter.value;
      }
      if (filter.type === 'in') {
        return filter.values.includes(row[filter.column as keyof T]);
      }
      return true;
    })
  );
};

const applyOrder = <T extends Record<string, any>>(rows: T[], order?: SelectPayload['order']): T[] => {
  if (!order) return rows;
  const { column, ascending } = order;
  return [...rows].sort((a, b) => {
    const valueA = a[column];
    const valueB = b[column];
    if (valueA === valueB) return 0;
    if (valueA === undefined || valueA === null) return ascending ? -1 : 1;
    if (valueB === undefined || valueB === null) return ascending ? 1 : -1;
    return ascending ? (valueA > valueB ? 1 : -1) : (valueA < valueB ? 1 : -1);
  });
};

export const withUsersJoin = (rows: ComentarioRow[]): (ComentarioRow & { users: { name: string } })[] => {
  const db = getDatabase();
  return rows.map((row) => {
    const user = db.users.find((candidate) => candidate.id === row.user_id);
    return {
      ...row,
      users: {
        name: user?.name ?? 'Usuario',
      },
    };
  });
};

const ensureDenunciaCounts = (db: MockDatabase, denunciaId: string) => {
  const denuncia = db.denuncias.find((item) => item.id === denunciaId);
  if (!denuncia) return;
  const likesCount = db.likes.filter((like) => like.denuncia_id === denunciaId).length;
  const comentariosCount = db.comentarios.filter((comentario) => comentario.denuncia_id === denunciaId).length;
  denuncia.likes_count = likesCount;
  denuncia.comentarios_count = comentariosCount;
};

const ensureAllDenunciaCounts = (db: MockDatabase) => {
  db.denuncias.forEach((denuncia) => ensureDenunciaCounts(db, denuncia.id));
};

const now = () => new Date().toISOString();

const selectTable = (db: MockDatabase, table: TableName) => {
  switch (table) {
    case 'denuncias':
      return db.denuncias;
    case 'comentarios':
      return db.comentarios;
    case 'likes':
      return db.likes;
    case 'moderaciones':
      return db.moderaciones;
    case 'users':
      return db.users;
  }
};

export const runSelect = <T>(payload: SelectPayload): QueryResult<T> => {
  const db = getDatabase();
  ensureAllDenunciaCounts(db);
  const source = selectTable(db, payload.table);
  const filtered = applyFilters(source as any[], payload.filters);
  const ordered = applyOrder(filtered, payload.order);
  const columns = payload.columns.replace(/\s/g, '');

  let data: any = ordered;

  if (payload.table === 'comentarios' && columns.includes('users(')) {
    data = withUsersJoin(ordered as ComentarioRow[]);
  }

  if (payload.single) {
    if (data.length !== 1) {
      return {
        data: null,
        error: { message: data.length === 0 ? 'No rows found' : 'Multiple rows found' },
      };
    }
    return {
      data: cloneDeep(data[0]),
      error: null,
    };
  }

  if (payload.maybeSingle) {
    if (data.length === 0) {
      return { data: null, error: null };
    }
    if (data.length > 1) {
      return { data: null, error: { message: 'Multiple rows found' } };
    }
    return { data: cloneDeep(data[0]), error: null };
  }

  const count = payload.options?.count === 'exact' ? data.length : null;
  return {
    data: cloneDeep(data),
    error: null,
    count,
  };
};

export const runInsert = (payload: InsertPayload): QueryResult<Record<string, unknown>[]> => {
  const db = getDatabase();
  const table = payload.table;
  const values = payload.values.map((value) => ({
    ...value,
    id: value.id ?? crypto.randomUUID(),
    created_at: value.created_at ?? now(),
  }));

  switch (table) {
    case 'denuncias': {
      const denuncias = values as Partial<DenunciaRow>[];
      denuncias.forEach((denuncia) => {
        db.denuncias.push({
          comentarios_count: denuncia.comentarios_count ?? 0,
          created_at: denuncia.created_at ?? now(),
          descripcion: denuncia.descripcion as string,
          estado: denuncia.estado ?? 'activa',
          id: denuncia.id as string,
          likes_count: denuncia.likes_count ?? 0,
          mail_asociado: (denuncia.mail_asociado ?? null) as string | null,
          nombre_asociado: denuncia.nombre_asociado as string,
          updated_at: denuncia.updated_at ?? now(),
          user_id: denuncia.user_id as string,
        });
      });
      break;
    }
    case 'comentarios': {
      const comentarios = values as Partial<ComentarioRow>[];
      comentarios.forEach((comentario) => {
        db.comentarios.push({
          id: comentario.id as string,
          denuncia_id: comentario.denuncia_id as string,
          user_id: comentario.user_id as string,
          contenido: comentario.contenido as string,
          created_at: comentario.created_at ?? now(),
        });
        ensureDenunciaCounts(db, comentario.denuncia_id as string);
      });
      break;
    }
    case 'likes': {
      const likes = values as Partial<LikeRow>[];
      likes.forEach((like) => {
        db.likes.push({
          id: like.id as string,
          denuncia_id: like.denuncia_id as string,
          user_id: like.user_id as string,
          created_at: like.created_at ?? now(),
        });
        ensureDenunciaCounts(db, like.denuncia_id as string);
      });
      break;
    }
    case 'moderaciones': {
      const moderaciones = values as Partial<ModeracionRow>[];
      moderaciones.forEach((moderacion) => {
        db.moderaciones.push({
          id: moderacion.id as string,
          denuncia_id: moderacion.denuncia_id as string,
          admin_id: moderacion.admin_id as string,
          accion: moderacion.accion as string,
          comentario: moderacion.comentario ?? null,
          fecha: moderacion.fecha ?? now(),
        });
      });
      break;
    }
    case 'users': {
      const users = values as Partial<MockUser>[];
      users.forEach((user) => {
        db.users.push({
          id: user.id as string,
          email: user.email as string,
          name: user.name as string,
          role: (user.role ?? 'user') as 'user' | 'admin',
          rut: user.rut ?? null,
          created_at: user.created_at ?? now(),
          password: (user as MockUser).password ?? 'password',
        });
      });
      break;
    }
  }

  setDatabase(db);
  return {
    data: cloneDeep(values),
    error: null,
  };
};

export const runUpdate = (payload: UpdatePayload): QueryResult<unknown[]> => {
  const db = getDatabase();
  const table = payload.table;
  const source = selectTable(db, table);
  const target = applyFilters(source as any[], payload.filters);

  if (target.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  target.forEach((row) => {
    Object.assign(row, payload.values);
    if ('updated_at' in row) {
      row.updated_at = payload.values.updated_at ?? now();
    }
  });

  if (table === 'denuncias') {
    (target as DenunciaRow[]).forEach((denuncia) => ensureDenunciaCounts(db, denuncia.id));
  }

  setDatabase(db);

  return {
    data: cloneDeep(target),
    error: null,
  };
};

export const runDelete = (payload: DeletePayload): QueryResult<unknown[]> => {
  const db = getDatabase();
  const table = payload.table;
  const source = selectTable(db, table);
  const toDelete = applyFilters(source as any[], payload.filters);

  if (toDelete.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const remaining = (source as any[]).filter((row) => !toDelete.includes(row));

  switch (table) {
    case 'denuncias':
      db.denuncias = remaining as DenunciaRow[];
      break;
    case 'comentarios':
      db.comentarios = remaining as ComentarioRow[];
      toDelete.forEach((comment: any) => ensureDenunciaCounts(db, comment.denuncia_id));
      break;
    case 'likes':
      db.likes = remaining as LikeRow[];
      toDelete.forEach((like: any) => ensureDenunciaCounts(db, like.denuncia_id));
      break;
    case 'moderaciones':
      db.moderaciones = remaining as ModeracionRow[];
      break;
    case 'users':
      db.users = remaining as MockUser[];
      break;
  }

  setDatabase(db);

  return {
    data: cloneDeep(toDelete),
    error: null,
  };
};

