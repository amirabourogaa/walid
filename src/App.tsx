import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "@/components/AuthGuard";
import { authService } from "@/lib/auth";
import Login from "./pages/Login";
import ManagerDashboard from "./pages/ManagerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ClientsPage from "./pages/ClientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import InvoicesPage from "./pages/InvoicesPage";
import ClientFoldersPage from "./pages/ClientFoldersPage";
import InvoicesArchivePage from "./pages/InvoicesArchivePage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import CaissesPage from "./pages/CaissesPage";
import CaissesDailyHistoryPage from "./pages/CaissesDailyHistoryPage";
import BankAccountsPage from "./pages/BankAccountsPage";
import TransactionsPage from "./pages/TransactionsPage";
import TransactionsArchivePage from "./pages/TransactionsArchivePage";
import TransactionsHistoryPage from "./pages/TransactionsHistoryPage";
import TransactionsEditPage from "./pages/TransactionsEditPage";
import InvoicesHistoryPage from "./pages/InvoicesHistoryPage";
import NotFound from "./pages/NotFound";
import WhatsAppTest from "./pages/WhatsAppTest";
import WorkDistributionPage from "./pages/WorkDistributionPage";
import InstallPWA from "./pages/InstallPWA";
import { Sidebar } from "./components/Sidebar";

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    // Initialize auth service on app mount
    authService.initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/install" element={<InstallPWA />} />
          <Route path="/whatsapp-test" element={<WhatsAppTest />} />
          <Route 
            path="/manager/whatsapp-test" 
            element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen bg-background">
                  <Sidebar />
                  <main className="flex-1 p-8">
                    <WhatsAppTest />
                  </main>
                </div>
              </AuthGuard>
            } 
          />
            
            {/* Manager Routes with Sidebar */}
            <Route path="/manager" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <ManagerDashboard />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/work-distribution" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 p-8">
                    <WorkDistributionPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/clients" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <ClientsPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/appointments" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <AppointmentsPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/folders" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <ClientFoldersPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/applications" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <ApplicationsPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/invoices" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <InvoicesPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/invoices-archive" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <InvoicesArchivePage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/statistics" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <StatisticsPage />
                  </main>
                </div>
              </AuthGuard>
            } />
            
            <Route path="/manager/settings" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <SettingsPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/caisses" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <CaissesPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/caisses-daily-history" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <CaissesDailyHistoryPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/bank-accounts" element={
              <AuthGuard requireRole="admin">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <BankAccountsPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/transactions" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <TransactionsPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/transactions-archive" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <TransactionsArchivePage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/transactions-history" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <TransactionsHistoryPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/transactions/edit/:id" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <TransactionsEditPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            <Route path="/manager/invoices-history" element={
              <AuthGuard requireRole="manager">
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1">
                    <InvoicesHistoryPage />
                  </main>
                </div>
              </AuthGuard>
            } />

            {/* Client Routes */}
            <Route path="/client" element={
              <AuthGuard requireRole="client">
                <ClientDashboard />
              </AuthGuard>
            } />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;