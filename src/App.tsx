import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/components/NotificationSystem";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import CreateAssessmentPage from "./pages/CreateAssessmentPage";
import AssessmentListPage from "./pages/AssessmentListPage";
import TakeAssessmentPage from "./pages/TakeAssessmentPage";
import AssessmentPreviewPage from "./pages/AssessmentPreviewPage";
import AssessmentAnalyticsPage from "./pages/AssessmentAnalyticsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import MonitoringPage from "./pages/MonitoringPage";
import ProctoringPage from "./pages/ProctoringPage";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalyticsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Index />} />
            <Route path="/assessments/create" element={
              <ProtectedRoute>
                <CreateAssessmentPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments" element={
              <ProtectedRoute>
                <AssessmentListPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:id/take" element={
              <ProtectedRoute>
                <TakeAssessmentPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:id/preview" element={
              <ProtectedRoute>
                <AssessmentPreviewPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:id/analytics" element={
              <ProtectedRoute>
                <AssessmentAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/monitoring" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <MonitoringPage />
              </ProtectedRoute>
            } />
            <Route path="/proctoring" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <ProctoringPage />
              </ProtectedRoute>
            } />
            <Route path="/advanced-analytics" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <AdvancedAnalyticsPage />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
