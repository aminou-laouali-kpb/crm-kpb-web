import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense, lazy } from 'react';

const TemplatePage = lazy(() => import('./pages/TemplatePage'));
const ReceiptPage = lazy(() => import('./pages/ReceiptPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AccountingPage = lazy(() => import('./pages/AccountingPage'));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage'));
const Index = lazy(() => import('./pages/Index'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Suspense fallback={<div>Chargement...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/template" element={<TemplatePage />} />
            <Route path="/receipt" element={<ReceiptPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/accounting" element={<AccountingPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
