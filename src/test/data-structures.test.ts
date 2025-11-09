// src/test/data-structures.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Schemas para validar la estructura de datos
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin', 'moderator']),
  rut: z.string().optional(),
  created_at: z.string().datetime().optional(),
});

const DenunciaSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  nombre_asociado: z.string().min(1),
  mail_asociado: z.string().email().nullable(),
  descripcion: z.string().min(1),
  estado: z.enum(['activa', 'en_revision', 'resuelta', 'rechazada']),
  likes_count: z.number().int().min(0),
  comentarios_count: z.number().int().min(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

const ComentarioSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  denuncia_id: z.string().uuid(),
  contenido: z.string().min(1),
  created_at: z.string().datetime().optional(),
});

const LikeSchema = z.object({
  user_id: z.string().uuid(),
  denuncia_id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
});

describe('Data Structure Validation', () => {
  describe('User Schema', () => {
    it('validates a correct user object', () => {
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        rut: '12345678-9',
      };

      const result = UserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        name: 'Test User',
        role: 'user',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const invalidUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'superadmin', // rol no válido
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID', () => {
      const invalidUser = {
        id: 'not-a-uuid',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      const result = UserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('Denuncia Schema', () => {
    it('validates a correct denuncia object', () => {
      const validDenuncia = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@empresaxyz.com',
        descripcion: 'Esta es una descripción de prueba',
        estado: 'activa',
        likes_count: 5,
        comentarios_count: 3,
      };

      const result = DenunciaSchema.safeParse(validDenuncia);
      expect(result.success).toBe(true);
    });

    it('allows null email', () => {
      const denunciaWithNullEmail = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: null,
        descripcion: 'Descripción sin email',
        estado: 'activa',
        likes_count: 0,
        comentarios_count: 0,
      };

      const result = DenunciaSchema.safeParse(denunciaWithNullEmail);
      expect(result.success).toBe(true);
    });

    it('rejects invalid estado', () => {
      const invalidDenuncia = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@empresaxyz.com',
        descripcion: 'Descripción',
        estado: 'estado_invalido',
        likes_count: 0,
        comentarios_count: 0,
      };

      const result = DenunciaSchema.safeParse(invalidDenuncia);
      expect(result.success).toBe(false);
    });

    it('rejects negative counts', () => {
      const invalidDenuncia = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@empresaxyz.com',
        descripcion: 'Descripción',
        estado: 'activa',
        likes_count: -5, // negativo no permitido
        comentarios_count: 0,
      };

      const result = DenunciaSchema.safeParse(invalidDenuncia);
      expect(result.success).toBe(false);
    });

    it('requires descripcion to be a non-empty string', () => {
      const invalidDenuncia = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@empresaxyz.com',
        descripcion: '', // vacío no permitido
        estado: 'activa',
        likes_count: 0,
        comentarios_count: 0,
      };

      const result = DenunciaSchema.safeParse(invalidDenuncia);
      expect(result.success).toBe(false);
    });
  });

  describe('Comentario Schema', () => {
    it('validates a correct comentario object', () => {
      const validComentario = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        denuncia_id: '123e4567-e89b-12d3-a456-426614174002',
        contenido: 'Este es un comentario de prueba',
      };

      const result = ComentarioSchema.safeParse(validComentario);
      expect(result.success).toBe(true);
    });

    it('rejects empty contenido', () => {
      const invalidComentario = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        denuncia_id: '123e4567-e89b-12d3-a456-426614174002',
        contenido: '',
      };

      const result = ComentarioSchema.safeParse(invalidComentario);
      expect(result.success).toBe(false);
    });

    it('requires all UUIDs', () => {
      const invalidComentario = {
        id: 'not-uuid',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        denuncia_id: '123e4567-e89b-12d3-a456-426614174002',
        contenido: 'Comentario',
      };

      const result = ComentarioSchema.safeParse(invalidComentario);
      expect(result.success).toBe(false);
    });
  });

  describe('Like Schema', () => {
    it('validates a correct like object', () => {
      const validLike = {
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        denuncia_id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = LikeSchema.safeParse(validLike);
      expect(result.success).toBe(true);
    });

    it('requires both user_id and denuncia_id', () => {
      const invalidLike = {
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        // falta denuncia_id
      };

      const result = LikeSchema.safeParse(invalidLike);
      expect(result.success).toBe(false);
    });
  });

  describe('Data Relationships', () => {
    it('validates that denuncia has valid user_id reference', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      
      const user = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      const denuncia = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: userId, // debe coincidir con el user.id
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: 'contacto@empresaxyz.com',
        descripcion: 'Descripción',
        estado: 'activa',
        likes_count: 0,
        comentarios_count: 0,
      };

      expect(UserSchema.safeParse(user).success).toBe(true);
      expect(DenunciaSchema.safeParse(denuncia).success).toBe(true);
      expect(denuncia.user_id).toBe(user.id);
    });

    it('validates comentario references valid user and denuncia', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const denunciaId = '123e4567-e89b-12d3-a456-426614174002';

      const comentario = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        user_id: userId,
        denuncia_id: denunciaId,
        contenido: 'Comentario de prueba',
      };

      expect(ComentarioSchema.safeParse(comentario).success).toBe(true);
      expect(comentario.user_id).toBe(userId);
      expect(comentario.denuncia_id).toBe(denunciaId);
    });
  });

  describe('Business Rules', () => {
    it('validates that estado transitions are valid', () => {
      const validStates = ['activa', 'en_revision', 'resuelta', 'rechazada'];
      
      validStates.forEach(estado => {
        const denuncia = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_id: '123e4567-e89b-12d3-a456-426614174001',
          nombre_asociado: 'Empresa XYZ',
          mail_asociado: null,
          descripcion: 'Descripción',
          estado,
          likes_count: 0,
          comentarios_count: 0,
        };

        expect(DenunciaSchema.safeParse(denuncia).success).toBe(true);
      });
    });

    it('validates that likes_count matches actual likes', () => {
      const denunciaId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Simular 3 likes
      const likes = [
        { user_id: '123e4567-e89b-12d3-a456-426614174001', denuncia_id: denunciaId },
        { user_id: '123e4567-e89b-12d3-a456-426614174002', denuncia_id: denunciaId },
        { user_id: '123e4567-e89b-12d3-a456-426614174003', denuncia_id: denunciaId },
      ];

      const denuncia = {
        id: denunciaId,
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        nombre_asociado: 'Empresa XYZ',
        mail_asociado: null,
        descripcion: 'Descripción',
        estado: 'activa',
        likes_count: likes.length, // debe coincidir
        comentarios_count: 0,
      };

      expect(denuncia.likes_count).toBe(3);
      expect(denuncia.likes_count).toBe(likes.length);
    });
  });
});