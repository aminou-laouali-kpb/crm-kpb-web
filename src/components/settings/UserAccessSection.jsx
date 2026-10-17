import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ROLE_OPTIONS,
  getRoleLabel,
  generateTempPassword,
  useAdminUsers,
  useCreateUser,
  useUpdateUserAccess,
  useSetUserActive,
  useResetUserPassword,
} from '@/hooks/useUserAdmin';
import { useSalesReps } from '@/hooks/useSalesReps';
import { useProcedureTypes, getProcedureLabel } from '@/hooks/useProcedureTypes';

const emptyForm = {
  email: '',
  password: '',
  fullName: '',
  roles: [],
  salesRepId: '',
  procedureScope: [],
};

const toggle = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const UserForm = ({ form, setForm, isCreate, salesReps, procedureTypes }) => {
  const isDossierRole = form.roles.includes('agent') || form.roles.includes('contractuel');

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="user-fullname">Nom complet</Label>
        <Input
          id="user-fullname"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          placeholder="Ex : Donatien …"
        />
      </div>

      {isCreate && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="user-email">Email de connexion</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-password">Mot de passe provisoire</Label>
            <div className="flex gap-2">
              <Input
                id="user-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: generateTempPassword() })}>
                Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">À transmettre à la personne (WhatsApp). 8 caractères minimum.</p>
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label>Rôles</Label>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((role) => (
            <label key={role.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.roles.includes(role.value)}
                onChange={() => setForm({ ...form, roles: toggle(form.roles, role.value) })}
              />
              {role.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Agent / Contractuel : accès uniquement à l’espace Dossiers.
        </p>
      </div>

      {form.roles.includes('commercial') && (
        <div className="grid gap-2">
          <Label htmlFor="user-salesrep">Commercial rattaché</Label>
          <select
            id="user-salesrep"
            value={form.salesRepId}
            onChange={(e) => setForm({ ...form, salesRepId: e.target.value })}
            className="w-full p-2 border rounded-md text-sm"
          >
            <option value="">Aucun (peut choisir le commercial sur la facture)</option>
            {salesReps.filter((r) => r.id).map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}{rep.active === false ? ' (inactif)' : ''}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Si rattaché, toutes ses factures sont enregistrées à ce nom (commissions fiables).
          </p>
        </div>
      )}

      {isDossierRole && (
        <div className="grid gap-2">
          <Label>Procédures visibles</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {procedureTypes.map((t) => (
              <label key={t.code} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.procedureScope.includes(t.code)}
                  onChange={() => setForm({ ...form, procedureScope: toggle(form.procedureScope, t.code) })}
                />
                {t.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Aucune case cochée = tous les dossiers.</p>
        </div>
      )}
    </div>
  );
};

const UserAccessSection = ({ currentUserId }) => {
  const { data: users = [], isLoading, error } = useAdminUsers();
  const { data: salesReps = [] } = useSalesReps({ includeInactive: true });
  const { data: procedureTypes = [] } = useProcedureTypes();
  const createUser = useCreateUser();
  const updateAccess = useUpdateUserAccess();
  const setActive = useSetUserActive();
  const resetPassword = useResetUserPassword();

  const [dialog, setDialog] = useState(null); // { mode: 'create' } | { mode: 'edit', user }
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm({ ...emptyForm, password: generateTempPassword() });
    setDialog({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({
      ...emptyForm,
      fullName: user.full_name || '',
      roles: (user.roles || []).map((r) => (r === 'sales_rep' ? 'commercial' : r)),
      salesRepId: user.sales_rep_id || '',
      procedureScope: user.procedure_scope || [],
    });
    setDialog({ mode: 'edit', user });
  };

  const scopeFor = (roles) =>
    roles.includes('agent') || roles.includes('contractuel') ? form.procedureScope : [];

  const handleSubmit = async () => {
    if (!form.roles.length) {
      toast.error('Choisissez au moins un rôle');
      return;
    }
    const salesRepId = form.roles.includes('commercial') ? form.salesRepId || null : null;
    try {
      if (dialog.mode === 'create') {
        await createUser.mutateAsync({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
          roles: form.roles,
          sales_rep_id: salesRepId,
          procedure_scope: scopeFor(form.roles),
        });
        toast.success(`Compte créé. Transmettez le mot de passe provisoire : ${form.password}`, { duration: 20000 });
      } else {
        await updateAccess.mutateAsync({
          userId: dialog.user.user_id,
          roles: form.roles,
          fullName: form.fullName,
          salesRepId,
          procedureScope: scopeFor(form.roles),
          isActive: dialog.user.is_active,
        });
        toast.success('Accès mis à jour');
      }
      setDialog(null);
    } catch (e) {
      toast.error(e.message || 'Opération impossible');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await setActive.mutateAsync({ userId: user.user_id, isActive: !user.is_active });
      toast.success(user.is_active ? 'Compte désactivé' : 'Compte réactivé');
      setDialog(null);
    } catch (e) {
      toast.error(e.message || 'Opération impossible');
    }
  };

  const handleResetPassword = async (user) => {
    const password = generateTempPassword();
    try {
      await resetPassword.mutateAsync({ userId: user.user_id, password });
      toast.success(`Nouveau mot de passe provisoire : ${password}`, { duration: 20000 });
    } catch (e) {
      toast.error(e.message || 'Opération impossible');
    }
  };

  const saving = createUser.isPending || updateAccess.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisateurs et accès</CardTitle>
        <CardDescription>
          Créez les comptes de l’équipe et définissez ce que chacun peut voir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <p className="text-sm text-destructive">
            Liste indisponible : la migration « 0007_fondations_securite » doit être appliquée.
          </p>
        )}
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.user_id} className="flex items-start justify-between gap-3 p-3 rounded border">
              <div className="min-w-0 space-y-1">
                <p className={`font-medium truncate ${user.is_active ? '' : 'line-through text-muted-foreground'}`}>
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <div className="flex flex-wrap gap-1">
                  {(user.roles || []).length === 0 && <Badge variant="destructive">Sans rôle</Badge>}
                  {(user.roles || []).map((role) => (
                    <Badge key={role} variant="secondary">{getRoleLabel(role)}</Badge>
                  ))}
                  {user.sales_rep_name && <Badge variant="outline">Commercial : {user.sales_rep_name}</Badge>}
                  {user.procedure_scope?.length > 0 && (
                    <Badge variant="outline">
                      {user.procedure_scope.map((code) => getProcedureLabel(procedureTypes, code)).join(', ')}
                    </Badge>
                  )}
                  {!user.is_active && <Badge variant="destructive">Désactivé</Badge>}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit(user)}>Modifier</Button>
            </div>
          ))}
        </div>
        <Button onClick={openCreate}>Créer un compte</Button>
      </CardContent>

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog?.mode === 'create' ? 'Créer un compte' : 'Modifier l’accès'}</DialogTitle>
            <DialogDescription>
              {dialog?.mode === 'edit' ? dialog.user.email : 'La personne pourra se connecter immédiatement.'}
            </DialogDescription>
          </DialogHeader>
          {dialog && (
            <UserForm
              form={form}
              setForm={setForm}
              isCreate={dialog.mode === 'create'}
              salesReps={salesReps}
              procedureTypes={procedureTypes}
            />
          )}
          <div className="flex flex-wrap justify-between gap-2 pt-2">
            {dialog?.mode === 'edit' && dialog.user.user_id !== currentUserId ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleResetPassword(dialog.user)} disabled={resetPassword.isPending}>
                  Nouveau mot de passe
                </Button>
                <Button
                  variant={dialog.user.is_active ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleActive(dialog.user)}
                  disabled={setActive.isPending}
                >
                  {dialog.user.is_active ? 'Désactiver' : 'Réactiver'}
                </Button>
              </div>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserAccessSection;
