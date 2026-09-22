import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from 'react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import RouteErrorBoundary from '@/components/layout/RouteErrorBoundary';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

const TemplatePage = lazyWithRetry(() => import('./pages/TemplatePage'), 'TemplatePage');
const CRMPage = lazyWithRetry(() => import('./pages/CRMPage'), 'CRMPage');
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'), 'DashboardPage');
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage'), 'ReportsPage');
const AccountingPage = lazyWithRetry(() => import('./pages/AccountingPage'), 'AccountingPage');
const ActivityLogsPage = lazyWithRetry(() => import('./pages/ActivityLogsPage'), 'ActivityLogsPage');
const DeletionRequestsPage = lazyWithRetry(() => import('./pages/DeletionRequestsPage'), 'DeletionRequestsPage');
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'), 'SettingsPage');
const ClientsPage = lazyWithRetry(() => import('./pages/ClientsPage'), 'ClientsPage');
const ContractsPage = lazyWithRetry(() => import('./pages/ContractsPage'), 'ContractsPage');
const ContractSignPage = lazyWithRetry(() => import('./pages/ContractSignPage'), 'ContractSignPage');
const Index = lazyWithRetry(() => import('./pages/Index'), 'Index');
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage'), 'AuthPage');

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
      <Toaster position="top-center" closeButton />
      <BrowserRouter>
        <RouteErrorBoundary>
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
                <Route path="/deletion-requests" element={<DeletionRequestsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
