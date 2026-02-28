import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: modules } = useQuery({
    queryKey: ["modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : course ? (
          <>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            {course.description && (
              <p className="text-muted-foreground mt-1">{course.description}</p>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              {course.institution && <span>{course.institution}</span>}
              {course.semester && <span>· {course.semester}</span>}
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-4">Modules</h2>
            {modules && modules.length > 0 ? (
              <div className="space-y-3">
                {modules.map((m) => (
                  <Card key={m.id}>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-base">{m.title}</CardTitle>
                    </CardHeader>
                    {m.description && (
                      <CardContent className="px-4 pb-3 pt-0">
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No modules yet. Content generation features are coming soon.</p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Course not found.</p>
        )}
      </PageContainer>
    </div>
  );
};

export default CourseDetail;
