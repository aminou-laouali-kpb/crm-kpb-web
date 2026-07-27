import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FileText,
  Users,
  BarChart3,
  FileBarChart,
  Calculator,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Settings,
  FileSignature,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAccountingAccess } from '@/hooks/useAccountingAccess';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import kpbLogo from '@/assets/kpb-logo.png';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-primary-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const AppLayout = ({ children, title, subtitle }) => {
  const { user, signOut } = useAuth(false);
  const { hasAccess: hasAccountingAccess } = useAccountingAccess();
  const { isAdmin } = useAdminCheck();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = [
    { to: '/', label: 'Factures', icon: FileText },
    { to: '/crm', label: 'CRM', icon: Users },
    { to: '/clients', label: 'Clients', icon: Users },
    { to: '/contracts', label: 'Contrats', icon: FileSignature },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { to: '/reports', label: 'Rapports', icon: FileBarChart },
    ...(hasAccountingAccess
      ? [{ to: '/accounting', label: 'Comptabilité', icon: Calculator }]
      : []),
    ...(isAdmin
      ? [
          { to: '/activity-logs', label: 'Logs', icon: ClipboardList },
          { to: '/settings', label: 'Paramètres', icon: Settings },
        ]
      : []),
  ];

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <img src={kpbLogo} alt="KPB Education" className="h-10 w-auto" />
          <div>
            <p className="font-bold text-sm">KPB Education</p>
            <p className="text-xs text-muted-foreground">CRM & Factures</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t">
        <p className="text-xs text-muted-foreground truncate px-3 mb-2">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-col fixed h-full z-30">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r shadow-xl">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            {title && <h1 className="text-lg font-bold">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
