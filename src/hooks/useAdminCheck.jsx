import { useAccess } from '@/hooks/useAccess';

export const useAdminCheck = () => {
  const { isAdmin, loading } = useAccess();
  return { isAdmin, loading };
};
