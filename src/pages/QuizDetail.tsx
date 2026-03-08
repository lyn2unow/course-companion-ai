import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import QuestionCard from "@/components/quizzes/QuestionCard";
import ExportQuizDialog from "@/components/quizzes/ExportQuizDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Download, AlertCircle } from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const QuizDetail = () => {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState("");
  const [deleteQId, setDeleteQId] = useState<string | null>(null);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>({});
  const [exporting, setExporting] = useState(false);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      return data;
    },
    enabled: !!courseId,
  });

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", quizId!).maybeSingle();
      if (error) throw error;
      if (data) setTitleVal(data.title);
      return data;
    },
    enabled: !!quizId,
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["quiz_questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId!)
        .order("sort_order");
      if (error) throw error;
      const pm: Record<string, number> = {};
      data?.forEach((q) => {
        pm[q.id] = pointsMap[q.id] ?? 1;
      });
      setPointsMap((prev) => ({ ...pm, ...prev }));
      return data;
    },
    enabled: !!quizId,
  });

  const totalPoints = useMemo(
    () => questions.reduce((sum, q) => sum + (pointsMap[q.id] ?? 1), 0),
    [questions, pointsMap]
  );

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (!titleVal.trim() || titleVal === quiz?.title) return;
    await supabase.from("quizzes").update({ title: titleVal.trim() }).eq("id", quizId!);
    queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
  };

  const handleUpdateQuestion = async (id: string, updates: Record<string, unknown>) => {
    const { error } = await supabase.from("quiz_questions").update(updates).eq("id", id);
    if (error) toast({ title: "Save failed", variant: "destructive" });
    else queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] });
  };

  const handleDeleteQuestion = async () => {
    if (!deleteQId) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", deleteQId);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["quiz_questions", quizId] });
      toast({ title: "Question deleted" });
    }
    setDeleteQId(null);
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-quiz", {
        body: { quiz_id: quizId, format },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Download the file
      const bytes = Uint8Array.from(atob(data.file), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Quiz exported successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

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
                  <BreadcrumbLink asChild><Link to={`/courses/${courseId}`}>{course?.name ?? "Course"}</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{quiz?.title ?? "Quiz"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : !quiz ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-4 max-w-sm">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h2 className="text-xl font-semibold">Quiz Not Found</h2>
                  <Button asChild><Link to={`/courses/${courseId}`}>Back to Course</Link></Button>
                </div>
              </div>
            ) : (
              <>
                {/* Quiz header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    {editingTitle ? (
                      <Input
                        value={titleVal}
                        onChange={(e) => setTitleVal(e.target.value)}
                        onBlur={handleTitleSave}
                        onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
                        autoFocus
                        className="text-2xl font-bold h-auto py-1"
                      />
                    ) : (
                      <h1
                        className="text-2xl font-bold cursor-pointer hover:text-muted-foreground transition-colors"
                        onClick={() => setEditingTitle(true)}
                        title="Click to edit title"
                      >
                        {quiz.title}
                      </h1>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>{questions.length} questions</span>
                      <span>{totalPoints} total points</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={questions.length === 0 || exporting}
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {exporting ? "Exporting..." : "Export"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {EXPORT_FORMATS.map((f) => (
                        <DropdownMenuItem key={f.value} onClick={() => handleExport(f.value)}>
                          {f.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Questions */}
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={i}
                      onUpdate={handleUpdateQuestion}
                      onDelete={(id) => setDeleteQId(id)}
                      points={pointsMap[q.id] ?? 1}
                      onPointsChange={(id, pts) =>
                        setPointsMap((prev) => ({ ...prev, [id]: pts }))
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </PageTransition>
      </PageContainer>

      <AlertDialog open={!!deleteQId} onOpenChange={(o) => !o && setDeleteQId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuestion}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuizDetail;
