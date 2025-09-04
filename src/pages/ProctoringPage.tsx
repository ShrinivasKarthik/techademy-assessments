import Navigation from "@/components/Navigation";
import LiveProctoringSystem from "@/components/LiveProctoringSystem";

const ProctoringPage = () => {
  const mockConfig = {
    cameraRequired: true,
    microphoneRequired: true,
    screenSharing: false,
    tabSwitchDetection: true,
    fullscreenRequired: true,
    faceDetection: true,
    voiceAnalysis: false,
    environmentCheck: true,
    browserLockdown: true
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <LiveProctoringSystem
          assessmentId="sample-assessment"
          participantId="sample-participant"
          config={mockConfig}
          onSecurityEvent={(event) => console.log('Security event:', event)}
          onStatusChange={(status) => console.log('Status change:', status)}
        />
      </div>
    </div>
  );
};

export default ProctoringPage;