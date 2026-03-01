import { type ReactNode } from "react";

const PageTransition = ({ children }: { children: ReactNode }) => (
  <div className="animate-fade-in">{children}</div>
);

export default PageTransition;
