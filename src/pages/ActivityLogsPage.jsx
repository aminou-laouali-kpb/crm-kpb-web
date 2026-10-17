import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import AppLayout from '@/components/layout/AppLayout';
import { useAdminCheck } from '../hooks/useAdminCheck';
import { useAuth } from '../hooks/useAuth';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTION_LABELS = {
  'SELECT': 'Consultation',
  'INSERT': 'Création',
  'UPDATE': 'Mise à jour',
  'DELETE': 'Suppression',
  'STATUS_CHANGE': 'Changement de statut',
  'EDIT': 'Modification',
  'LOGIN': 'Connexion',
  'EXPORT': 'Export',
  'UPLOAD': 'Upload',
};

const ACTION_COLORS = {
  'SELECT': 'bg-blue-100 text-blue-800',
  'INSERT': 'bg-green-100 text-green-800',
  'UPDATE': 'bg-yellow-100 text-yellow-800',
  'DELETE': 'bg-red-100 text-red-800',
  'STATUS_CHANGE': 'bg-purple-100 text-purple-800',
  'EDIT': 'bg-orange-100 text-orange-800',
  'LOGIN': 'bg-cyan-100 text-cyan-800',
  'EXPORT': 'bg-indigo-100 text-indigo-800',
  'UPLOAD': 'bg-teal-100 text-teal-800',
};

const ActivityLogsPage = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [logs, setLogs] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterTable, setFilterTable] = useState('all');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/crm');
      return;
    }
    if (!adminLoading && isAdmin) {
      fetchLogs();
    }
  }, [adminLoading, isAdmin]);

  const fetchLogs = async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);

      // Noms des utilisateurs (table profiles, lot 1) — facultatif
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email');
      setUserNames(Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name || p.email])));
    } catch (error) {
      toast.error("Erreur lors du chargement des logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    return matchesAction && matchesTable;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueTables = [...new Set(logs.map(l => l.table_name))];

  if (authLoading || adminLoading || loading) {
    return <div className="container mx-auto px-4 py-8">Chargement...</div>;
  }

  if (!isAdmin) return null;

  return (
    <AppLayout title="Logs d'activité" subtitle="Journal d'audit des actions">
      <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center gap-2 sr-only">
        <Activity className="h-6 w-6 text-primary" />
        Logs d'activité
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les tables</SelectItem>
            {uniqueTables.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {filteredLogs.length} entrée(s)
      </div>

      {/* Logs table */}
      <div className="bg-background rounded-lg shadow border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Utilisateur</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Table</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {new Date(log.accessed_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-foreground text-xs">
                    {userNames[log.user_id] || (log.user_id ? <span className="font-mono">{log.user_id.substring(0, 8)}...</span> : 'Système')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {log.table_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[300px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucun log trouvé
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ActivityLogsPage;
