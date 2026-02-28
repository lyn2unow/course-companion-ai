import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

const PageContainer = ({ children, className }: PageContainerProps) => (
  <main className={cn("mx-auto max-w-5xl px-6 py-16", className)}>
    {children}
  </main>
);

export default PageContainer;
