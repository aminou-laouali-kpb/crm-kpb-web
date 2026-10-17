import { useAccess } from '@/hooks/useAccess';

/**
 * Hook to check if the current user has access to accounting features
 * Returns: { hasAccess, isAdmin, isAccountant, loading }
 * - hasAccess: true if user has either 'admin' or 'comptable' role
 * - isAdmin: true if user has 'admin' role
 * - isAccountant: true if user has 'comptable' role
 * - loading: true while checking roles
 */
export const useAccountingAccess = () => {
  const { isAdmin, isAccountant, loading } = useAccess();
  return {
    hasAccess: isAdmin || isAccountant,
    isAdmin,
    isAccountant,
    loading,
  };
};
