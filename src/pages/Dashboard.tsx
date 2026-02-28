import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <p className="text-muted-foreground">Your courses and tools will appear here.</p>
      </PageContainer>
    </div>
  );
};

export default Dashboard;
