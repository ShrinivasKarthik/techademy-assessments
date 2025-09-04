import Navigation from "@/components/Navigation";
import RealTimeMonitoring from "@/components/RealTimeMonitoring";

const MonitoringPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <RealTimeMonitoring />
      </div>
    </div>
  );
};

export default MonitoringPage;