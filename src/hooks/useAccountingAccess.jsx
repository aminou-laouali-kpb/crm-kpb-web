import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to check if the current user has access to accounting features
 * Returns: { hasAccess, isAdmin, isAccountant, loading }
 * - hasAccess: true if user has either 'admin' or 'comptable' role
 * - isAdmin: true if user has 'admin' role
 * - isAccountant: true if user has 'comptable' role (but not admin)
 * - loading: true while checking roles
 */
export const useAccountingAccess = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccountingAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAdmin(false);
          setIsAccountant(false);
          setLoading(false);
          return;
        }

        // Check both roles in parallel
        const [adminResult, accountantResult] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'comptable' })
        ]);

        if (adminResult.error) {
          console.error('Error checking admin status:', adminResult.error);
        }
        if (accountantResult.error) {
          console.error('Error checking accountant status:', accountantResult.error);
        }

        setIsAdmin(adminResult.data === true);
        setIsAccountant(accountantResult.data === true);
      } catch (error) {
        console.error('Error in accounting access check:', error);
        setIsAdmin(false);
        setIsAccountant(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccountingAccess();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccountingAccess();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    hasAccess: isAdmin || isAccountant,
    isAdmin, 
    isAccountant,
    loading 
  };
};
