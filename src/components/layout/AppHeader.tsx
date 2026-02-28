import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const AppHeader = () => {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b border-sidebar-border bg-navy">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold text-gold tracking-wide">CourseForge</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/70">{user?.email}</span>
          <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 hover:text-white" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
