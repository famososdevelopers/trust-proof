export type ModeracionAccion = 'Aprobada' | 'En revisión' | 'Resuelta';

const accionEstadoMap: Record<ModeracionAccion, string> = {
  Aprobada: 'activa',
  'En revisión': 'en revisión',
  Resuelta: 'resuelta',
};

export const mapModeracionAccionToEstado = (accion: ModeracionAccion) => {
  return accionEstadoMap[accion];
};

export const isModeracionAccion = (accion: string): accion is ModeracionAccion =>
  Object.prototype.hasOwnProperty.call(accionEstadoMap, accion);


