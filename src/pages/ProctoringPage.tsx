import Navigation from "@/components/Navigation";
import LiveProctoringSystem from "@/components/LiveProctoringSystem";

const ProctoringPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <LiveProctoringSystem />
      </div>
    </div>
  );
};

export default ProctoringPage;