import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center bg-navy px-4">
    <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-8 shadow-md">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gold tracking-wide">CourseForge</h2>
      </div>
      {children}
    </div>
  </div>
);

export default AuthLayout;
