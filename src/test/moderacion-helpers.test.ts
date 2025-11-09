import { describe, expect, test } from 'vitest';

import { isModeracionAccion, mapModeracionAccionToEstado } from '@/lib/moderacion';

describe('mapModeracionAccionToEstado', () => {
  test('mapea acciones conocidas a sus estados correspondientes', () => {
    expect(mapModeracionAccionToEstado('Aprobada')).toBe('activa');
    expect(mapModeracionAccionToEstado('En revisión')).toBe('en revisión');
    expect(mapModeracionAccionToEstado('Resuelta')).toBe('resuelta');
  });

  test('isModeracionAccion valida correctamente las acciones soportadas', () => {
    expect(isModeracionAccion('Aprobada')).toBe(true);
    expect(isModeracionAccion('En revisión')).toBe(true);
    expect(isModeracionAccion('Resuelta')).toBe(true);
    expect(isModeracionAccion('Otro')).toBe(false);
  });
});


