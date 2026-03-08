import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import { AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    // Check for existing session (token already processed by Supabase client)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        readyRef.current = true;
        setReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        readyRef.current = true;
        setReady(true);
      }
    });

    const timer = setTimeout(() => {
      if (!readyRef.current) setExpired(true);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Password updated", description: "You're all set." });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  if (expired && !ready) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-card-foreground">Reset link expired or invalid</h1>
          <p className="text-sm text-muted-foreground">Please request a new password reset link.</p>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Back to Forgot Password</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (!ready) {
    return (
      <AuthLayout>
        <p className="text-muted-foreground text-center">Verifying recovery token…</p>
        <div className="flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-card-foreground">Set new password</h1>
        <p className="text-sm text-muted-foreground">Enter your new password below</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
