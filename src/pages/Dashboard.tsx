import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import CourseCard from "@/components/dashboard/CourseCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, CheckCircle2, Circle, Sparkles, X, Eye, EyeOff, Loader2,
} from "lucide-react";

const BANNER_DISMISSED_KEY = "courseforge_onboarding_dismissed";

const CourseCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2"><Skeleton className="h-5 w-3/4" /></CardHeader>
    <CardContent><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-3 w-1/2" /></CardContent>
  </Card>
);

const OnboardingEmpty = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <Card className="max-w-lg w-full text-center">
      <CardContent className="pt-8 pb-8 space-y-6">
        <Sparkles className="h-10 w-10 mx-auto text-accent" />
        <div>
          <h2 className="text-xl font-bold mb-1">Welcome to CourseForge</h2>
          <p className="text-muted-foreground text-sm">Let's get your first course set up. It takes about 5 minutes.</p>
        </div>
        <div className="text-left space-y-3 mx-auto max-w-xs">
          <StepRow done={false} number={1} label="Create your first course" />
          <StepRow done={false} number={2} label="Add your course materials" />
          <StepRow done={false} number={3} label="Generate your first content" />
        </div>
        <Link to="/courses/new">
          <Button size="lg" className="w-full"><Plus className="h-4 w-4 mr-2" /> Create Your First Course</Button>
        </Link>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Take a quick tour</button>
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
          <p className="text-sm font-medium">You're making great progress! Complete these steps to get the most out of CourseForge:</p>
          <div className="space-y-2">
            <StepRow done label="Course created" />
            {firstCourse ? (
              <Link to={`/courses/${firstCourse.id}?tab=materials`} className="block">
                <StepRow done={hasMaterials} number={2} label="Add source materials" linked />
              </Link>
            ) : <StepRow done={false} number={2} label="Add source materials" />}
            {firstCourse ? (
              <Link to={`/courses/${firstCourse.id}`} className="block">
                <StepRow done={hasContent} number={3} label="Generate your first content" linked />
              </Link>
            ) : <StepRow done={false} number={3} label="Generate your first content" />}
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5" aria-label="Dismiss getting started banner">
          <X className="h-4 w-4" />
        </button>
      </div>
    </CardContent>
  </Card>
);

const StepRow = ({ done, label, linked }: { done: boolean; number?: number; label: string; linked?: boolean }) => (
  <div className={`flex items-center gap-2 text-sm ${linked && !done ? "text-accent hover:underline" : ""}`}>
    {done ? <CheckCircle2 className="h-4 w-4 text-accent shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
    <span className={done ? "text-muted-foreground line-through" : ""}>{label}</span>
  </div>
);

// ─── Types ───
interface CourseRow {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  semester: string | null;
  teaching_philosophy: string | null;
  source_hierarchy: unknown;
  user_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown; // for status and other dynamic cols
}

// ─── Dashboard ───
const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem(BANNER_DISMISSED_KEY) === "true");
  const [showArchived, setShowArchived] = useState(false);

  // Duplicate dialog state
  const [dupCourse, setDupCourse] = useState<CourseRow | null>(null);
  const [dupName, setDupName] = useState("");
  const [dupSemester, setDupSemester] = useState("");
  const [dupModules, setDupModules] = useState(true);
  const [dupMaterials, setDupMaterials] = useState(true);
  const [dupContent, setDupContent] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Delete dialog state
  const [deleteCourse, setDeleteCourse] = useState<CourseRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as CourseRow[];
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
      return { hasMaterials: (matRes.count ?? 0) > 0, hasContent: (contentRes.count ?? 0) > 0 };
    },
    enabled: !!firstCourse && !bannerDismissed,
  });

  const handleDismiss = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, "true");
    setBannerDismissed(true);
  };

  // ─── Archive / Unarchive ───
  const handleArchive = async (course: CourseRow) => {
    const isArchived = course.status === "archived";
    const { error } = await supabase.from("courses").update({ status: isArchived ? "active" : "archived" } as Record<string, unknown>).eq("id", course.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: isArchived ? "Course restored" : "Course archived" });
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  // ─── Delete ───
  const handleDelete = async () => {
    if (!deleteCourse) return;
    setDeleting(true);
    const { error } = await supabase.from("courses").delete().eq("id", deleteCourse.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Course deleted" });
    setDeleteCourse(null);
    queryClient.invalidateQueries({ queryKey: ["courses"] });
  };

  // ─── Duplicate ───
  const openDuplicate = (course: CourseRow) => {
    setDupCourse(course);
    setDupName(`Copy of ${course.name}`);
    setDupSemester("");
    setDupModules(true);
    setDupMaterials(true);
    setDupContent(false);
  };

  const handleDuplicate = async () => {
    if (!dupCourse || !user || !dupSemester.trim()) return;
    setDuplicating(true);
    try {
      // 1. Create new course
      const { data: newCourse, error: courseErr } = await supabase.from("courses").insert({
        name: dupName.trim(),
        description: dupCourse.description,
        institution: dupCourse.institution,
        semester: dupSemester.trim(),
        teaching_philosophy: dupCourse.teaching_philosophy,
        source_hierarchy: dupCourse.source_hierarchy as any,
        user_id: user.id,
      }).select("*").single();
      if (courseErr || !newCourse) throw courseErr || new Error("Failed to create course");

      // 2. Copy modules
      let moduleIdMap: Record<string, string> = {};
      if (dupModules) {
        const { data: modules } = await supabase.from("modules").select("*").eq("course_id", dupCourse.id).order("sort_order");
        if (modules && modules.length > 0) {
          for (const mod of modules) {
            const { data: newMod } = await supabase.from("modules").insert({
              course_id: newCourse.id,
              user_id: user.id,
              title: mod.title,
              description: mod.description,
              week_number: mod.week_number,
              learning_objectives: mod.learning_objectives,
              sort_order: mod.sort_order,
              status: mod.status,
            }).select("id").single();
            if (newMod) moduleIdMap[mod.id] = newMod.id;
          }
        }
      }

      // 3. Copy materials (reference same storage_path)
      if (dupMaterials) {
        const { data: materials } = await supabase.from("course_materials").select("*").eq("course_id", dupCourse.id);
        if (materials && materials.length > 0) {
          const matInserts = materials.map((m) => ({
            course_id: newCourse.id,
            user_id: user.id,
            file_name: m.file_name,
            file_type: m.file_type,
            file_size: m.file_size,
            material_type: m.material_type,
            storage_path: m.storage_path,
            extracted_text: m.extracted_text,
          }));
          await supabase.from("course_materials").insert(matInserts);
        }
      }

      // 4. Copy generated content
      if (dupContent && Object.keys(moduleIdMap).length > 0) {
        const oldModuleIds = Object.keys(moduleIdMap);
        const { data: contents } = await supabase.from("generated_content").select("*").in("module_id", oldModuleIds).eq("is_current_version", true).is("deleted_at", null);
        if (contents && contents.length > 0) {
          const contentInserts = contents.filter((c) => moduleIdMap[c.module_id]).map((c) => ({
            module_id: moduleIdMap[c.module_id],
            user_id: user.id,
            content_type: c.content_type,
            content: c.content,
            edited_content: c.edited_content ? `${c.edited_content}\n\n---\n_Duplicated from ${dupCourse.name} — please review before use._` : null,
            human_reviewed: false,
            is_approved: false,
            is_current_version: true,
            version: 1,
          }));
          await supabase.from("generated_content").insert(contentInserts);
        }
      }

      toast({ title: "Course duplicated successfully" });
      setDupCourse(null);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      navigate(`/courses/${newCourse.id}`);
    } catch (err: any) {
      toast({ title: "Duplication failed", description: err?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  // ─── Filter courses ───
  const activeCourses = courses?.filter((c) => (c.status ?? "active") !== "archived") ?? [];
  const archivedCourses = courses?.filter((c) => c.status === "archived") ?? [];
  const hasCourses = activeCourses.length > 0 || archivedCourses.length > 0;
  const allDone = onboardingStatus?.hasMaterials && onboardingStatus?.hasContent;
  const showBanner = hasCourses && !bannerDismissed && !allDone;

  const renderCourseCard = (course: CourseRow, i: number) => (
    <Card
      key={course.id}
      className={`hover:shadow-md transition-shadow h-full opacity-0 animate-fade-in ${course.status === "archived" ? "opacity-60" : ""}`}
      style={{ animationDelay: `${i * 75}ms` }}
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
              <DropdownMenuItem onClick={() => openDuplicate(course)}>
                <Copy className="mr-2 h-4 w-4" /> Duplicate course
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleArchive(course)}>
                <Archive className="mr-2 h-4 w-4" /> {course.status === "archived" ? "Restore course" : "Archive course"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteCourse(course)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <Link to={`/courses/${course.id}`}>
        <CardContent className="cursor-pointer">
          {course.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{course.description}</p>}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {course.institution && <span>{course.institution}</span>}
            {course.semester && <span>· {course.semester}</span>}
            {course.status === "archived" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Archived</Badge>}
          </div>
        </CardContent>
      </Link>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer>
        <PageTransition>
          <main id="main-content">
            {isLoading ? (
              <>
                <div className="flex items-center justify-between mb-8"><h1 className="text-2xl font-bold">My Courses</h1></div>
                <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <CourseCardSkeleton key={i} />)}</div>
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
                  <Link to="/courses/new"><Button><Plus className="h-4 w-4 mr-2" /> Create New Course</Button></Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activeCourses.map((course, i) => renderCourseCard(course, i))}
                </div>

                {archivedCourses.length > 0 && (
                  <div className="mt-8">
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showArchived ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showArchived ? "Hide" : "Show"} archived courses ({archivedCourses.length})
                    </button>
                    {showArchived && (
                      <div className="grid gap-4 sm:grid-cols-2 mt-4">
                        {archivedCourses.map((course, i) => renderCourseCard(course, i))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <OnboardingEmpty />
            )}
          </main>
        </PageTransition>
      </PageContainer>

      {/* Duplicate Dialog */}
      <Dialog open={!!dupCourse} onOpenChange={(o) => !o && setDupCourse(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Course</DialogTitle>
            <DialogDescription>Create a copy of "{dupCourse?.name}" for a new semester.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dup-name">Course Name</Label>
              <Input id="dup-name" value={dupName} onChange={(e) => setDupName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dup-semester">Semester *</Label>
              <Input id="dup-semester" value={dupSemester} onChange={(e) => setDupSemester(e.target.value)} placeholder="e.g. Fall 2026" />
            </div>
            <div className="space-y-3">
              <Label>What to copy</Label>
              <div className="flex items-center gap-2">
                <Checkbox id="dup-modules" checked={dupModules} onCheckedChange={(v) => setDupModules(!!v)} />
                <Label htmlFor="dup-modules" className="font-normal">Copy modules</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dup-materials" checked={dupMaterials} onCheckedChange={(v) => setDupMaterials(!!v)} />
                <Label htmlFor="dup-materials" className="font-normal">Copy source materials</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="dup-content" checked={dupContent} onCheckedChange={(v) => setDupContent(!!v)} />
                <Label htmlFor="dup-content" className="font-normal">Copy generated content</Label>
              </div>
              {dupContent && (
                <p className="text-xs text-muted-foreground ml-6">Content will be marked as unreviewed.</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDupCourse(null)} disabled={duplicating}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={duplicating || !dupSemester.trim() || !dupName.trim()}>
              {duplicating ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Duplicating...</> : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCourse} onOpenChange={(o) => !o && setDeleteCourse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteCourse?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this course and all its modules, materials, quizzes, and generated content. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
