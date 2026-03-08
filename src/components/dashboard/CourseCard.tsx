import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen, MoreVertical, FolderOpen, Copy, Archive, Trash2,
  Layers, FileText, HelpCircle,
} from "lucide-react";

interface CourseRow {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  semester: string | null;
  status?: string;
  [key: string]: unknown;
}

interface CourseCardProps {
  course: CourseRow;
  index: number;
  onDuplicate: (course: CourseRow) => void;
  onArchive: (course: CourseRow) => void;
  onDelete: (course: CourseRow) => void;
}

const CourseCard = ({ course, index, onDuplicate, onArchive, onDelete }: CourseCardProps) => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["course-stats", course.id],
    queryFn: async () => {
      const [modRes, contentRes, quizRes] = await Promise.all([
        supabase.from("modules").select("id", { count: "exact", head: true }).eq("course_id", course.id),
        supabase.from("generated_content").select("id", { count: "exact", head: true })
          .in("module_id",
            (await supabase.from("modules").select("id").eq("course_id", course.id)).data?.map(m => m.id) ?? []
          )
          .eq("is_current_version", true)
          .is("deleted_at", null),
        supabase.from("quizzes").select("id", { count: "exact", head: true })
          .in("module_id",
            (await supabase.from("modules").select("id").eq("course_id", course.id)).data?.map(m => m.id) ?? []
          ),
      ]);
      return {
        modules: modRes.count ?? 0,
        content: contentRes.count ?? 0,
        quizzes: quizRes.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  return (
    <Card
      className={`hover:shadow-md transition-shadow h-full opacity-0 animate-fade-in ${course.status === "archived" ? "opacity-60" : ""}`}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/courses/${course.id}`} className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-start gap-2 cursor-pointer hover:text-accent transition-colors">
              <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-accent" />
              <span className="truncate">{course.name}</span>
            </CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                <FolderOpen className="mr-2 h-4 w-4" /> Open course
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(course)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate course
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(course)}>
                <Archive className="mr-2 h-4 w-4" /> {course.status === "archived" ? "Restore course" : "Archive course"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(course)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <Link to={`/courses/${course.id}`}>
        <CardContent className="cursor-pointer space-y-2">
          {course.description && <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {course.institution && <span>{course.institution}</span>}
            {course.semester && <span>· {course.semester}</span>}
            {course.status === "archived" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Archived</Badge>}
          </div>
          {stats && (
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground/80">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" /> {stats.modules} module{stats.modules !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> {stats.content} content
              </span>
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> {stats.quizzes} quiz{stats.quizzes !== 1 ? "zes" : ""}
              </span>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
};

export default CourseCard;
