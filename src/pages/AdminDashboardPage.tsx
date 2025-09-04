import { useNavigate } from "react-router-dom";
import AdminDashboard from "@/components/AdminDashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AdminDashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
      
      <AdminDashboard />
    </div>
  );
};

export default AdminDashboardPage;