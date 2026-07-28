import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

const TemplatePage = lazy(() => import('./pages/TemplatePage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const ContractsPage = lazy(() => import('./pages/ContractsPage'));
const ContractSignPage = lazy(() => import('./pages/ContractSignPage'));
const Index = lazy(() => import('./pages/Index'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/contrat/:token" element={<ContractSignPage />} />
            <Route path="/sign/:token" element={<ContractSignPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/template" element={<TemplatePage />} />
              <Route path="/crm" element={<CRMPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/activity-logs" element={<ActivityLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
