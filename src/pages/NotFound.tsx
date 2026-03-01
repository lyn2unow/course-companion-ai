import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-gold mb-2">404</h1>
        <p className="text-xl text-white/80 mb-6">Page not found</p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 hover:text-white">Home</Button>
          </Link>
          <Link to="/dashboard">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
