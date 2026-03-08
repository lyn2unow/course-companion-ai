import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ModuleCard from "@/components/modules/ModuleCard";
import AddModuleDialog from "@/components/modules/AddModuleDialog";
import MaterialsManager from "@/components/course-materials/MaterialsManager";
import QuizList from "@/components/quizzes/QuizList";
import CreateQuizDialog from "@/components/quizzes/CreateQuizDialog";
import EditSourceHierarchyDialog from "@/components/course-setup/EditSourceHierarchyDialog";
import { Plus, BookOpen, FolderOpen, AlertCircle, FileQuestion, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

const CourseDetailSkeleton = () => (
  <div>
    <Skeleton className="h-8 w-1/2 mb-2" />
    <Skeleton className="h-4 w-3/4 mb-6" />
    <Skeleton className="h-5 w-24 mb-4" />
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModule, setShowAddModule] = useState(false);
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null);
  const [addingModule, setAddingModule] = useState(false);
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [showEditHierarchy, setShowEditHierarchy] = useState(false);

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: modules = [] } = useQuery({
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

  const handleAddModule = async (title: string, description: string) => {
    if (!user || !id) return;
    setAddingModule(true);
    try {
      const maxOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.sort_order)) : -1;
      const { error } = await supabase.from("modules").insert({
        course_id: id,
        user_id: user.id,
        title,
        description: description || null,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["modules", id] });
      setShowAddModule(false);
      toast({ title: "Module added" });
    } catch (e: any) {
      toast({ title: "Failed to add module", description: e.message, variant: "destructive" });
    } finally {
      setAddingModule(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteModuleId) return;
    const { error } = await supabase.from("modules").delete().eq("id", deleteModuleId);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["modules", id] });
      toast({ title: "Module deleted" });
    }
    setDeleteModuleId(null);
  };

  const handleReorder = async (moduleId: string, direction: "up" | "down") => {
    const idx = modules.findIndex((m) => m.id === moduleId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;
    const a = modules[idx];
    const b = modules[swapIdx];
    await Promise.all([
      supabase.from("modules").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("modules").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    queryClient.invalidateQueries({ queryKey: ["modules", id] });
  };

  const handleCreateQuiz = async (params: {
    title: string;
    moduleId: string | null;
    questionCount: number;
    questionTypes: string[];
    difficulty: string;
  }) => {
    if (!user || !id) return;
    const targetModuleId = params.moduleId ?? modules[0]?.id;
    if (!targetModuleId) {
      toast({ title: "Add a module first", variant: "destructive" });
      return;
    }
    setCreatingQuiz(true);
    try {
      // Create quiz record first
      const { data: quiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          title: params.title,
          module_id: targetModuleId,
          user_id: user.id,
          question_count: params.questionCount,
          question_types: params.questionTypes,
        })
        .select("id")
        .single();
      if (quizErr) throw quizErr;

      // Call generate-quiz edge function (it saves questions server-side)
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: {
          course_id: id,
          module_id: targetModuleId,
          quiz_id: quiz.id,
          question_count: params.questionCount,
          question_types: params.questionTypes,
          difficulty: params.difficulty,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["quizzes", id] });
      setShowCreateQuiz(false);
      toast({ title: "Quiz generated successfully" });

      // Navigate to quiz detail
      window.location.href = `/courses/${id}/quizzes/${quiz.id}`;
    } catch (e: any) {
      toast({ title: "Quiz generation failed", description: e.message, variant: "destructive" });
    } finally {
      setCreatingQuiz(false);
    }
  };

  const sourceHierarchy = Array.isArray(course?.source_hierarchy)
    ? (course.source_hierarchy as string[])
    : [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <PageTransition>
          <main id="main-content">
            <Breadcrumb className="mb-4" aria-label="Breadcrumb">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/dashboard">Dashboard</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{course?.name ?? "Course"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {isLoading ? (
              <CourseDetailSkeleton />
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

                {(course.teaching_philosophy || sourceHierarchy.length > 0) && (
                  <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-2">
                    {course.teaching_philosophy && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Teaching Philosophy</span>
                        <p className="text-sm mt-1">{course.teaching_philosophy}</p>
                      </div>
                    )}
                    {sourceHierarchy.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Source Hierarchy</span>
                        <p className="text-sm mt-1">{sourceHierarchy.join(" → ")}</p>
                      </div>
                    )}
                  </div>
                )}

                <Tabs defaultValue="modules" className="mt-8">
                  <TabsList className="grid w-full grid-cols-3 max-w-sm">
                    <TabsTrigger value="modules" className="gap-2">
                      <BookOpen className="h-4 w-4" /> Modules
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="gap-2">
                      <FolderOpen className="h-4 w-4" /> Materials
                    </TabsTrigger>
                    <TabsTrigger value="quizzes" className="gap-2">
                      <FileQuestion className="h-4 w-4" /> Quizzes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="modules">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Modules</h2>
                      <Button size="sm" onClick={() => setShowAddModule(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Add Module
                      </Button>
                    </div>

                    {modules.length > 0 ? (
                      <div className="space-y-3">
                        {modules.map((m, idx) => (
                          <div key={m.id} className="opacity-0 animate-fade-in" style={{ animationDelay: `${idx * 75}ms` }}>
                            <ModuleCard
                              module={m}
                              courseId={id!}
                              isFirst={idx === 0}
                              isLast={idx === modules.length - 1}
                              onMoveUp={() => handleReorder(m.id, "up")}
                              onMoveDown={() => handleReorder(m.id, "down")}
                              onDelete={() => setDeleteModuleId(m.id)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No modules yet. Add your first module to start generating content.
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="materials">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">Course Materials</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload source materials so the AI can generate content based on your actual course content.
                      </p>
                    </div>
                    <MaterialsManager courseId={id!} />
                  </TabsContent>

                  <TabsContent value="quizzes">
                    <QuizList
                      courseId={id!}
                      modules={modules}
                      onCreateQuiz={() => setShowCreateQuiz(true)}
                    />
                  </TabsContent>
                </Tabs>
              </>
            ) : (!course || isError) ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4 max-w-sm">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h2 className="text-xl font-semibold">Course Not Found</h2>
                  <p className="text-sm text-muted-foreground">This course doesn't exist or you don't have access to it.</p>
                  <Button asChild>
                    <Link to="/dashboard">Back to Dashboard</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </main>
        </PageTransition>

        <AddModuleDialog
          open={showAddModule}
          onOpenChange={setShowAddModule}
          onSubmit={handleAddModule}
          isLoading={addingModule}
        />

        <CreateQuizDialog
          open={showCreateQuiz}
          onOpenChange={setShowCreateQuiz}
          modules={modules}
          onSubmit={handleCreateQuiz}
          isLoading={creatingQuiz}
        />

        <AlertDialog open={!!deleteModuleId} onOpenChange={(open) => !open && setDeleteModuleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Module</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this module and all its generated content. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteModule}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </div>
  );
};

export default CourseDetail;
