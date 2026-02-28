import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-navy">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-bold text-gold tracking-wide">CourseForge</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-32 text-center">
        <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
          Prepare your courses in&nbsp;minutes, not&nbsp;hours
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/70">
          AI-powered content generation, quiz creation, and rubric-based grading — built for adjunct faculty who need to move fast.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/signup">Start for free</Link>
          </Button>
          <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Index;
