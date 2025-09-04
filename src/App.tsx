import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AssessmentStateProvider } from "@/contexts/AssessmentStateContext";
import { NotificationProvider } from "@/components/NotificationSystem";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SecurityGuard } from "@/components/SecurityGuard";
import { ProductionMonitor } from "@/components/ProductionMonitor";
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
import UserOnboarding from "./components/UserOnboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AssessmentStateProvider>
            <NotificationProvider>
              <SecurityGuard requireAuth={false}>
                <Toaster />
                <Sonner />
                <ProductionMonitor />
                <BrowserRouter>
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/onboarding" element={<UserOnboarding />} />
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
                      <SecurityGuard allowedRoles={['student', 'admin', 'instructor']}>
                        <ProtectedRoute>
                          <TakeAssessmentPage />
                        </ProtectedRoute>
                      </SecurityGuard>
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
                      <SecurityGuard allowedRoles={['admin']}>
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      </SecurityGuard>
                    } />
                    <Route path="/monitoring" element={
                      <SecurityGuard allowedRoles={['admin', 'instructor']}>
                        <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                          <MonitoringPage />
                        </ProtectedRoute>
                      </SecurityGuard>
                    } />
                    <Route path="/proctoring" element={
                      <SecurityGuard allowedRoles={['admin', 'instructor']}>
                        <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                          <ProctoringPage />
                        </ProtectedRoute>
                      </SecurityGuard>
                    } />
                    <Route path="/advanced-analytics" element={
                      <SecurityGuard allowedRoles={['admin', 'instructor']}>
                        <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                          <AdvancedAnalyticsPage />
                        </ProtectedRoute>
                      </SecurityGuard>
                    } />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </SecurityGuard>
            </NotificationProvider>
          </AssessmentStateProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
