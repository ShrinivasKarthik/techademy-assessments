import Navigation from "@/components/Navigation";
import QuestionTemplateSelector from "@/components/QuestionTemplateSelector";

const QuestionTemplatesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-6">
        <QuestionTemplateSelector 
          onSelectTemplate={(template) => {
            console.log('Template selected:', template);
            // In a real implementation, this would handle template selection
          }}
          mode="manage"
        />
      </div>
    </div>
  );
};

export default QuestionTemplatesPage;