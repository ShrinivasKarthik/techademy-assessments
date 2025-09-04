import Navigation from "@/components/Navigation";
import RoleBasedDashboard from "@/components/RoleBasedDashboard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <RoleBasedDashboard />
    </div>
  );
};

export default Index;
