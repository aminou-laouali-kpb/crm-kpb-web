import { FolderKanban } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAccess } from '@/hooks/useAccess';

// Espace des agents de traitement : le module complet (étapes, journal quotidien,
// vues Kanban/Tableau) arrive au lot 2. Cette page sert de point d'entrée.
const DossiersPage = () => {
  const { profile } = useAccess();

  return (
    <AppLayout title="Dossiers" subtitle="Suivi des procédures étudiants">
      <Card className="max-w-xl">
        <CardContent className="py-10 text-center space-y-3">
          <FolderKanban className="h-10 w-10 mx-auto text-primary" />
          <p className="font-semibold">
            Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ''} !
          </p>
          <p className="text-sm text-muted-foreground">
            L’espace Dossiers est en cours de mise en place. Vous y retrouverez bientôt
            les dossiers qui vous sont affectés, leurs étapes et le point du jour à remplir.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default DossiersPage;
