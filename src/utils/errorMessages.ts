export const translateAuthError = (errorMessage: string): string => {
  const errorMap: { [key: string]: string } = {
    // Auth errors
    'Invalid login credentials': 'Credenciales inválidas',
    'Email not confirmed': 'Email no confirmado. Revisa tu correo.',
    'already registered': 'Este email ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Signup requires a valid password': 'Se requiere una contraseña válida',
    'Email rate limit exceeded': 'Demasiados intentos. Intenta más tarde.',
    'Invalid email or password': 'Email o contraseña incorrectos',
    'Email link is invalid or has expired': 'El link ha expirado o es inválido',
    'Token has expired or is invalid': 'El token ha expirado',
    'New password should be different from the old password': 'La nueva contraseña debe ser diferente a la anterior',
    
    // Database errors
    'duplicate key value violates unique constraint': 'Este registro ya existe',
    'new row violates row-level security policy': 'No tienes permisos para realizar esta acción',
    
    // Network errors
    'Failed to fetch': 'Error de conexión. Verifica tu internet.',
    'Network request failed': 'Error de red. Intenta nuevamente.',
  };

  if (errorMap[errorMessage]) {
    return errorMap[errorMessage];
  }

  for (const [key, value] of Object.entries(errorMap)) {
    if (errorMessage.includes(key)) {
      return value;
    }
  }

  return errorMessage;
};