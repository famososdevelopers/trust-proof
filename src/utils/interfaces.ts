export interface Evidencia {
    id: string;
    nombre_archivo: string;
    tipo_archivo: string;
    tamano: number;
    url_storage: string;
    denuncia_id: string;
}

export interface Denuncia {
    id: string;
    nombre_asociado: string;
    mail_asociado: string | null;
    descripcion: string;
    estado: string;
    likes_count: number;
    comentarios_count: number;
    created_at: string;
    evidencias?: Evidencia[];
    user_id?: string;
}
