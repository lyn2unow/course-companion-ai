import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, BookOpen, Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">My Courses</h1>
          <Link to="/courses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Create New Course
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {courses.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
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
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No courses yet</h2>
            <p className="text-muted-foreground mb-6">Create your first course to get started with AI-powered content generation.</p>
            <Link to="/courses/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Create New Course
              </Button>
            </Link>
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default Dashboard;
