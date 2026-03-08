import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";

const AppHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.user_metadata?.display_name || user?.email || "";
  const initials = displayName
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="border-b border-sidebar-border bg-navy">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-2 focus:bg-background focus:text-foreground">
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold text-gold tracking-wide">CourseForge</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2 text-white hover:bg-white/10 hover:text-white">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline-block">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppHeader;
