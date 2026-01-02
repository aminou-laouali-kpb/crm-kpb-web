/**
 * Maps Supabase authentication errors to user-friendly messages
 * Prevents leaking sensitive system information to users
 */
export const mapAuthError = (error) => {
  const errorMessage = error?.message || '';
  
  const errorMap = {
    'Invalid login credentials': 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.',
    'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter.',
    'User already registered': 'Cet email est déjà utilisé. Veuillez vous connecter.',
    'Signup requires a valid password': 'Le mot de passe fourni n\'est pas valide.',
    'Password should be at least': 'Le mot de passe doit contenir au moins 6 caractères.',
    'rate limit': 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
    'Email rate limit exceeded': 'Trop de tentatives. Veuillez réessayer plus tard.',
    'Unable to validate email address': 'Adresse email invalide.',
    'Invalid email': 'Adresse email invalide.',
    'Network': 'Erreur de connexion. Vérifiez votre connexion internet.',
    'fetch': 'Erreur de connexion. Vérifiez votre connexion internet.',
  };
  
  for (const [key, message] of Object.entries(errorMap)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  
  // Generic fallback message - never expose the actual error
  return 'Une erreur est survenue. Veuillez réessayer.';
};

export const mapLoginError = (error) => {
  return mapAuthError(error);
};

export const mapSignupError = (error) => {
  return mapAuthError(error);
};
