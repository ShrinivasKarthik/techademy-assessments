import Navigation from "@/components/Navigation";
import SimpleQuestionBank from "@/components/SimpleQuestionBank";

const QuestionBankPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <SimpleQuestionBank />
    </div>
  );
};

export default QuestionBankPage;