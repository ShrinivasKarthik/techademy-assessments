import Navigation from "@/components/Navigation";
import QuestionBankEnhanced from "@/components/QuestionBankEnhanced";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const QuestionBankPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <ErrorBoundary>
          <QuestionBankEnhanced />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default QuestionBankPage;