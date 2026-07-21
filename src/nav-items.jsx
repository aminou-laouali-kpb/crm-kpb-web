import {
  FileText,
  Users,
  BarChart3,
  FileBarChart,
  Calculator,
  ClipboardList,
  Settings,
} from "lucide-react";

export const navItems = [
  { title: "Factures", to: "/", icon: FileText },
  { title: "CRM", to: "/crm", icon: Users },
  { title: "Dashboard", to: "/dashboard", icon: BarChart3 },
  { title: "Rapports", to: "/reports", icon: FileBarChart },
  { title: "Comptabilité", to: "/accounting", icon: Calculator, role: "accounting" },
  { title: "Logs", to: "/activity-logs", icon: ClipboardList, role: "admin" },
  { title: "Paramètres", to: "/settings", icon: Settings, role: "admin" },
];
