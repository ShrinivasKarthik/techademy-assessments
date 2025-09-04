import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/assessments/create" element={<CreateAssessmentPage />} />
          <Route path="/assessments" element={<AssessmentListPage />} />
          <Route path="/assessments/:id/take" element={<TakeAssessmentPage />} />
          <Route path="/assessments/:id/preview" element={<AssessmentPreviewPage />} />
          <Route path="/assessments/:id/analytics" element={<AssessmentAnalyticsPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/proctoring" element={<ProctoringPage />} />
          <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
