import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, FileQuestion, Clock } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface QuizListProps {
  courseId: string;
  modules: Array<{ id: string; title: string }>;
  onCreateQuiz: () => void;
}

const QuizList = ({ courseId, modules, onCreateQuiz }: QuizListProps) => {
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["quizzes", courseId],
    queryFn: async () => {
      const moduleIds = modules.map((m) => m.id);
      if (moduleIds.length === 0) return [];
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .in("module_id", moduleIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: modules.length > 0,
  });

  const getModuleTitle = (moduleId: string) =>
    modules.find((m) => m.id === moduleId)?.title ?? "Unknown Module";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Quizzes</h2>
        <Button size="sm" onClick={onCreateQuiz}>
          <Plus className="h-4 w-4 mr-1" /> Create Quiz
        </Button>
      </div>

      {quizzes.length > 0 ? (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <FileQuestion className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <Link
                    to={`/courses/${courseId}/quizzes/${quiz.id}`}
                    className="font-medium hover:underline"
                  >
                    {quiz.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{getModuleTitle(quiz.module_id)}</span>
                    <span>·</span>
                    <span>{quiz.question_count} questions</span>
                    <span>·</span>
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(quiz.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
              <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                {quiz.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No quizzes yet. Create your first quiz to get started.
        </p>
      )}
    </div>
  );
};

export default QuizList;
