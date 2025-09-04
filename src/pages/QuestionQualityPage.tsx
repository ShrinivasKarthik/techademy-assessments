import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QuestionQualityPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Quality Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Quality management feature coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuestionQualityPage;