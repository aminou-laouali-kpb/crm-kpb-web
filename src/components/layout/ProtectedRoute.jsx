import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAccess } from '@/hooks/useAccess';
import { Button } from '@/components/ui/button';

/** Pages accessibles aux comptes limités à l'espace Dossiers (agents, contractuels). */
export const DOSSIER_ROUTES = ['/dossiers'];

const PendingAccess = ({ email, onSignOut, inactive }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="max-w-md text-center space-y-4">
      <h1 className="text-xl font-bold">
        {inactive ? 'Compte désactivé' : 'Compte en attente d’activation'}
      </h1>
      <p className="text-muted-foreground text-sm">
        {inactive
          ? 'Ce compte a été désactivé. Contactez l’administrateur si vous pensez qu’il s’agit d’une erreur.'
          : `Le compte ${email || ''} n’a pas encore de rôle. Un administrateur doit l’activer depuis Paramètres → Utilisateurs.`}
      </p>
      <Button variant="outline" onClick={onSignOut}>Se déconnecter</Button>
    </div>
  </div>
);

const ProtectedRoute = ({ children, requireAuth = true }) => {
  const { user, loading, signOut } = useAuth(false);
  const access = useAccess();
  const location = useLocation();

  if (loading || (user && access.loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (user && !access.hasAnyRole) {
    return <PendingAccess email={user.email} onSignOut={signOut} inactive={!access.isActive} />;
  }

  if (access.isDossierOnly && !DOSSIER_ROUTES.includes(location.pathname)) {
    return <Navigate to={DOSSIER_ROUTES[0]} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
