import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { useAuthStore } from '@/stores/authStore';
import { loginAsAdmin, loginAsUser, logout } from './utils/auth';

const resetStore = () => {
  const store = useAuthStore.getState();
  store.setSession(null);
  store.setUser(null);
  store.setLoading(true);
  useAuthStore.setState({ isAdmin: false });
};

describe('authStore', () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(async () => {
    await logout();
    resetStore();
  });

  test('actualiza el usuario y mantiene rol de usuario estándar tras iniciar sesión', async () => {
    await loginAsUser();

    await waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('user@example.com');
    });

    expect(useAuthStore.getState().isAdmin).toBe(false);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  test('detecta correctamente cuando el usuario es administrador', async () => {
    await loginAsAdmin();

    await waitFor(() => {
      expect(useAuthStore.getState().isAdmin).toBe(true);
    });
    expect(useAuthStore.getState().user?.email).toBe('admin@example.com');
  });

  test('signOut limpia la sesión y restablece el estado', async () => {
    await loginAsUser();

    await waitFor(() => {
      expect(useAuthStore.getState().user).not.toBeNull();
    });

    await useAuthStore.getState().signOut();

    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull();
    });

    const state = useAuthStore.getState();
    expect(state.session).toBeNull();
    expect(state.isAdmin).toBe(false);
  });
});


