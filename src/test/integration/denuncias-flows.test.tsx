import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { Routes, Route } from 'react-router-dom';

import DetalleDenuncia from '@/pages/DetalleDenuncia';
import Moderacion from '@/pages/Moderacion';
import NuevaDenuncia from '@/pages/NuevaDenuncia';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

import { loginAsAdmin, loginAsUser } from '../utils/auth';
import { createTestQueryClient } from '../utils/queryClient';
import { renderWithProviders } from '../utils/renderWithProviders';

describe('Flujos completos de denuncias', () => {
  test('crear una denuncia actualiza el cache y navega a inicio', async () => {
    const queryClient = createTestQueryClient();
    await loginAsUser();
    const user = userEvent.setup();

    const initialDenuncias = queryClient.getQueryData(['denuncias', 'list']) as any[] | undefined;
    const initialCount = initialDenuncias?.length ?? 0;

    renderWithProviders(
      <Routes>
        <Route path="/" element={<div data-testid="home-page">Inicio</div>} />
        <Route path="/nueva-denuncia" element={<NuevaDenuncia />} />
      </Routes>,
      { initialEntries: ['/nueva-denuncia'], queryClient }
    );

    await screen.findByRole('heading', { name: 'Nueva Denuncia' });

    await user.type(
      screen.getByLabelText('Nombre de la persona o entidad denunciada *'),
      'Acme Corp'
    );
    await user.type(screen.getByLabelText('Email asociado (opcional)'), 'contacto@acme.com');
    await user.type(
      screen.getByLabelText('Descripción de la denuncia *'),
      'Descripción detallada de la denuncia contra Acme.'
    );

    await user.click(screen.getByRole('button', { name: 'Crear Denuncia' }));

    await screen.findByTestId('home-page');

    const denuncias = queryClient.getQueryData(['denuncias', 'list']) as any[];
    expect(denuncias.length).toBe(initialCount + 1);
    const nueva = denuncias.find((denuncia) => denuncia.nombre_asociado === 'Acme Corp');
    expect(nueva).toBeDefined();
    expect(nueva.likes_count).toBe(0);
    expect(nueva.comentarios_count).toBe(0);
    expect(nueva.user_id).toBe(useAuthStore.getState().user?.id);
  });

  test('dar y quitar like refleja cambios en UI y cache', async () => {
    const queryClient = createTestQueryClient();
    await loginAsUser();
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/denuncia/:id" element={<DetalleDenuncia />} />
      </Routes>,
      { initialEntries: ['/denuncia/denuncia-1'], queryClient }
    );

    await screen.findByText('Empresa XYZ');

    const likeButton = screen.getByRole('button', { name: /Dar like a la denuncia/ });
    expect(likeButton).toBeInTheDocument();

    await user.click(likeButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Quitar like a la denuncia/ })
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Quitar like a la denuncia/ })).toHaveTextContent(
        '2'
      );
    });

    const sessionUser = useAuthStore.getState().user;
    expect(sessionUser).not.toBeNull();

    const likesPorUsuario = queryClient.getQueryData([
      'likes',
      'byUser',
      sessionUser!.id,
    ]) as any[];
    expect(likesPorUsuario.some((like) => like.denuncia_id === 'denuncia-1')).toBe(true);

    await user.click(screen.getByRole('button', { name: /Quitar like a la denuncia/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Dar like a la denuncia/ })).toHaveTextContent(
        '1'
      );
    });

    const likesActualizados = queryClient.getQueryData([
      'likes',
      'byUser',
      sessionUser!.id,
    ]) as any[];
    expect(likesActualizados.some((like) => like.denuncia_id === 'denuncia-1')).toBe(false);
  });

  test('agregar y eliminar comentario mantiene consistente el cache', async () => {
    const queryClient = createTestQueryClient();
    await loginAsUser();
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/denuncia/:id" element={<DetalleDenuncia />} />
      </Routes>,
      { initialEntries: ['/denuncia/denuncia-1'], queryClient }
    );

    await screen.findByText('Empresa XYZ');

    const comentario = 'Comentario de integración';

    await user.type(screen.getByPlaceholderText('Escribe un comentario...'), comentario);
    await user.click(screen.getByRole('button', { name: 'Comentar' }));

    await screen.findByText(comentario);

    const comentariosCache = queryClient.getQueryData([
      'comentarios',
      'byDenuncia',
      'denuncia-1',
    ]) as any[];
    expect(comentariosCache.some((item) => item.contenido === comentario)).toBe(true);

    await user.click(screen.getByLabelText('Eliminar comentario'));

    await waitFor(() => {
      expect(screen.queryByText(comentario)).not.toBeInTheDocument();
    });

    const comentariosActualizados = queryClient.getQueryData([
      'comentarios',
      'byDenuncia',
      'denuncia-1',
    ]) as any[];
    expect(comentariosActualizados.some((item) => item.contenido === comentario)).toBe(false);
  });

  test('moderación admin actualiza estado y registra acción', async () => {
    const queryClient = createTestQueryClient();
    await loginAsAdmin();
    const user = userEvent.setup();

    renderWithProviders(
      <Routes>
        <Route path="/moderacion" element={<Moderacion />} />
      </Routes>,
      { initialEntries: ['/moderacion'], queryClient }
    );

    await waitFor(() => {
      expect(screen.getByText('Panel de Moderación')).toBeInTheDocument();
    });

    const headingJuan = await screen.findByText('Juan Pérez');
    const tarjetaJuan = headingJuan.closest('.shadow-card');
    expect(tarjetaJuan).toBeTruthy();

    const botonResolver = within(tarjetaJuan as HTMLElement).getByRole('button', { name: 'Resolver' });

    await user.click(botonResolver);

    const dialogo = await screen.findByRole('dialog');

    await user.click(
      within(dialogo).getByRole('button', {
        name: 'Resolver',
      })
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    const detalle = queryClient.getQueryData(['denuncias', 'detail', 'denuncia-2']) as any;
    expect(detalle.estado).toBe('resuelta');

    const { data: moderaciones, error } = await supabase
      .from('moderaciones')
      .select('*')
      .eq('denuncia_id', 'denuncia-2');

    expect(error).toBeNull();
    expect(moderaciones).toHaveLength(1);
    expect(moderaciones?.[0].accion).toBe('Resuelta');
  });

  test('bloquea la eliminación de denuncias de otros usuarios', async () => {
    createTestQueryClient();
    await loginAsUser();

    const resultado = await supabase.from('denuncias').delete().eq('id', 'denuncia-2');
    expect(resultado.error).not.toBeNull();

    const { data, error } = await supabase
      .from('denuncias')
      .select('*')
      .eq('id', 'denuncia-2')
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data.estado).toBeDefined();
  });
});

