import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, BookOpen, CheckCircle2, Circle, Sparkles, X } from "lucide-react";

const BANNER_DISMISSED_KEY = "courseforge_onboarding_dismissed";

const CourseCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-3/4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-3 w-1/2" />
    </CardContent>
  </Card>
);

const OnboardingEmpty = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <Card className="max-w-lg w-full text-center">
      <CardContent className="pt-8 pb-8 space-y-6">
        <Sparkles className="h-10 w-10 mx-auto text-accent" />
        <div>
          <h2 className="text-xl font-bold mb-1">Welcome to CourseForge</h2>
          <p className="text-muted-foreground text-sm">
            Let's get your first course set up. It takes about 5 minutes.
          </p>
        </div>

        <div className="text-left space-y-3 mx-auto max-w-xs">
          <StepRow done={false} number={1} label="Create your first course" />
          <StepRow done={false} number={2} label="Add your course materials" />
          <StepRow done={false} number={3} label="Generate your first content" />
        </div>

        <Link to="/courses/new">
          <Button size="lg" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Create Your First Course
          </Button>
        </Link>

        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Take a quick tour
        </button>
      </CardContent>
    </Card>
  </div>
);

interface GettingStartedBannerProps {
  firstCourse: { id: string; name: string } | null;
  hasMaterials: boolean;
  hasContent: boolean;
  onDismiss: () => void;
}

const GettingStartedBanner = ({ firstCourse, hasMaterials, hasContent, onDismiss }: GettingStartedBannerProps) => (
  <Card className="mb-6 border-accent/30 bg-accent/5">
    <CardContent className="py-4 px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <p className="text-sm font-medium">
            You're making great progress! Complete these steps to get the most out of CourseForge:
          </p>
          <div className="space-y-2">
            <StepRow done label="Course created" />
            {firstCourse ? (
              <Link to={`/courses/${firstCourse.id}?tab=materials`} className="block">
                <StepRow done={hasMaterials} number={2} label="Add source materials" linked />
              </Link>
            ) : (
              <StepRow done={false} number={2} label="Add source materials" />
            )}
            {firstCourse ? (
              <Link to={`/courses/${firstCourse.id}`} className="block">
                <StepRow done={hasContent} number={3} label="Generate your first content" linked />
              </Link>
            ) : (
              <StepRow done={false} number={3} label="Generate your first content" />
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
          aria-label="Dismiss getting started banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </CardContent>
  </Card>
);

const StepRow = ({ done, number, label, linked }: { done: boolean; number?: number; label: string; linked?: boolean }) => (
  <div className={`flex items-center gap-2 text-sm ${linked && !done ? "text-accent hover:underline" : ""}`}>
    {done ? (
      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
    )}
    <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === "true"
  );

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const firstCourse = courses?.[courses.length - 1] ?? null;

  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboarding-status", firstCourse?.id],
    queryFn: async () => {
      if (!firstCourse) return { hasMaterials: false, hasContent: false };
      const [matRes, contentRes] = await Promise.all([
        supabase.from("course_materials").select("id", { count: "exact", head: true }).eq("course_id", firstCourse.id),
        supabase.from("generated_content").select("id", { count: "exact", head: true }).eq("module_id", firstCourse.id),
      ]);
      return {
        hasMaterials: (matRes.count ?? 0) > 0,
        hasContent: (contentRes.count ?? 0) > 0,
      };
    },
    enabled: !!firstCourse && !bannerDismissed,
  });

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setBannerDismissed(true);
  };

  const hasCourses = courses && courses.length > 0;
  const allDone = onboardingStatus?.hasMaterials && onboardingStatus?.hasContent;
  const showBanner = hasCourses && !bannerDismissed && !allDone;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <PageTransition>
          <main id="main-content">
            {isLoading ? (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl font-bold">My Courses</h1>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <CourseCardSkeleton key={i} />
                  ))}
                </div>
              </>
            ) : hasCourses ? (
              <>
                {showBanner && (
                  <GettingStartedBanner
                    firstCourse={firstCourse}
                    hasMaterials={onboardingStatus?.hasMaterials ?? false}
                    hasContent={onboardingStatus?.hasContent ?? false}
                    onDismiss={handleDismiss}
                  />
                )}
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl font-bold">My Courses</h1>
                  <Link to="/courses/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" /> Create New Course
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {courses.map((course, i) => (
                    <Link key={course.id} to={`/courses/${course.id}`}>
                      <Card
                        className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-0 animate-fade-in"
                        style={{ animationDelay: `${i * 75}ms` }}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-start gap-2">
                            <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-accent" />
                            {course.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {course.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{course.description}</p>
                          )}
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            {course.institution && <span>{course.institution}</span>}
                            {course.semester && <span>· {course.semester}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <OnboardingEmpty />
            )}
          </main>
        </PageTransition>
      </PageContainer>
    </div>
  );
};

export default Dashboard;
