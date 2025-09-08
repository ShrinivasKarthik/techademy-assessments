import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AssessmentStateProvider } from "@/contexts/AssessmentStateContext";
import { NotificationProvider } from "@/components/NotificationSystem";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import CreateAssessmentPage from "./pages/CreateAssessmentPage";
import EditAssessmentPage from "./pages/EditAssessmentPage";
import AssessmentListPage from "./pages/AssessmentListPage";
import TakeAssessmentPage from "./pages/TakeAssessmentPage";
import AssessmentPreviewPage from "./pages/AssessmentPreviewPage";
import PublicAssessmentPage from "./pages/PublicAssessmentPage";
import AssessmentAnalyticsPage from "./pages/AssessmentAnalyticsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import MonitoringPage from "./pages/MonitoringPage";
import ProctoringPage from "./pages/ProctoringPage";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalyticsPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import QuestionQualityPage from "./pages/QuestionQualityPage";
import SkillAnalyticsPage from "./pages/SkillAnalyticsPage";
import AIInsightsPage from "./pages/AIInsightsPage";

import AdvancedReportsPage from "./pages/AdvancedReportsPage";
import OnboardingPage from "./pages/OnboardingPage";
import QuestionAnalyticsPage from "./pages/QuestionAnalyticsPage";
import InstructorStudentsPage from "./pages/InstructorStudentsPage";
import CollaborativePage from "./pages/CollaborativePage";
import SmartAssemblyPage from "./pages/SmartAssemblyPage";
import AdvancedQuestionBuilderPage from "./pages/AdvancedQuestionBuilderPage";
import PerformanceMetricsPage from "./pages/PerformanceMetricsPage";
import ComprehensiveReportsPage from "./pages/ComprehensiveReportsPage";
import QueueMonitoringPage from "./pages/QueueMonitoringPage";
import PredictiveAnalyticsPage from "./pages/PredictiveAnalyticsPage";
import LearningPathRecommendationsPage from "./pages/LearningPathRecommendationsPage";
import FraudDetectionPage from "./pages/FraudDetectionPage";
import CohortAnalysisPage from "./pages/CohortAnalysisPage";
import IntegrationManagerPage from "./pages/IntegrationManagerPage";
import PerformanceMonitorPage from "./pages/PerformanceMonitorPage";
import AccessibilityManagerPage from "./pages/AccessibilityManagerPage";
import ContextualHelpPage from "./pages/ContextualHelpPage";
import ResultsPage from "./pages/ResultsPage";
import AssessmentResultsPage from "./pages/AssessmentResultsPage";
import AssessmentEvaluationPage from "./pages/AssessmentEvaluationPage";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AssessmentStateProvider>
          <NotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/home" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor', 'student']}>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/" element={<HomePage />} />
            <Route path="/assessments/create" element={
              <ProtectedRoute>
                <CreateAssessmentPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:id/edit" element={
              <ProtectedRoute>
                <EditAssessmentPage />
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
            <Route path="/question-bank" element={
              <ProtectedRoute>
                <QuestionBankPage />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/instructor/students" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorStudentsPage />
              </ProtectedRoute>
            } />
            <Route path="/monitoring" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <MonitoringPage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <AdvancedReportsPage />
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
            <Route path="/question-analytics" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <QuestionAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/question-quality" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <QuestionQualityPage />
              </ProtectedRoute>
            } />
            <Route path="/skills-analytics" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <SkillAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/collaborative" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <CollaborativePage />
              </ProtectedRoute>
            } />
            <Route path="/smart-assembly" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <SmartAssemblyPage />
              </ProtectedRoute>
            } />
            <Route path="/advanced-builder" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <AdvancedQuestionBuilderPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:id/insights" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <AIInsightsPage />
              </ProtectedRoute>
            } />
            <Route path="/performance-metrics" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <PerformanceMetricsPage />
              </ProtectedRoute>
            } />
            <Route path="/comprehensive-reports" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <ComprehensiveReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/queue-monitoring" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <QueueMonitoringPage />
              </ProtectedRoute>
            } />
            <Route path="/predictive-analytics" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <PredictiveAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/learning-paths" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <LearningPathRecommendationsPage />
              </ProtectedRoute>
            } />
            <Route path="/fraud-detection" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <FraudDetectionPage />
              </ProtectedRoute>
            } />
            <Route path="/cohort-analysis" element={
              <ProtectedRoute allowedRoles={['admin', 'instructor']}>
                <CohortAnalysisPage />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <IntegrationManagerPage />
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PerformanceMonitorPage />
              </ProtectedRoute>
            } />
            <Route path="/accessibility" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AccessibilityManagerPage />
              </ProtectedRoute>
            } />
            <Route path="/help" element={
              <ProtectedRoute>
                <ContextualHelpPage />
              </ProtectedRoute>
            } />
            <Route path="/results" element={
              <ProtectedRoute allowedRoles={['student', 'admin', 'instructor']}>
                <ResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/results/:instanceId" element={
              <ProtectedRoute allowedRoles={['student', 'admin', 'instructor']}>
                <AssessmentResultsPage />
              </ProtectedRoute>
            } />
            <Route path="/assessments/:assessmentId/evaluating/:instanceId" element={
              <ProtectedRoute allowedRoles={['student', 'admin', 'instructor']}>
                <AssessmentEvaluationPage />
              </ProtectedRoute>
            } />
            {/* Public assessment route - no authentication required */}
            <Route path="/public/assessment/:token" element={<PublicAssessmentPage />} />
            {/* Public evaluation route for both authenticated and anonymous users */}
            <Route path="/assessment/:assessmentId/evaluation/:instanceId" element={<AssessmentEvaluationPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AssessmentStateProvider>
  </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;