import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";

export const useAuth = (requireAuth = true) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (requireAuth && !session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, requireAuth]);

  const signOut = async () => {
    // Clear all form data from localStorage to prevent PII exposure on shared devices
    localStorage.removeItem('formData');
    localStorage.removeItem('receiptFormData');
    localStorage.removeItem('billData');
    
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return { user, session, loading, signOut };
};
