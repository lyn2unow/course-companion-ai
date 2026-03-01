import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import ContentTabs from "@/components/content-generation/ContentTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ModuleDetailSkeleton = () => (
  <div>
    <Skeleton className="h-8 w-1/2 mb-2" />
    <Skeleton className="h-4 w-3/4 mb-6" />
    <Skeleton className="h-10 w-full mb-4" />
    <Skeleton className="h-40 w-full rounded-lg" />
  </div>
);

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingType, setGeneratingType] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase.from("modules").select("*").eq("id", moduleId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["generated_content", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_content")
        .select("*")
        .eq("module_id", moduleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });

  const handleGenerate = async (contentType: string) => {
    if (!user || !courseId || !moduleId) return;
    setGeneratingType(contentType);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { moduleId, contentType, courseId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { error: insertError } = await supabase.from("generated_content").insert({
        module_id: moduleId,
        content_type: contentType,
        content: data.content,
        user_id: user.id,
      });
      if (insertError) throw insertError;
      queryClient.invalidateQueries({ queryKey: ["generated_content", moduleId] });
      toast({ title: "Content generated successfully" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingType(null);
    }
  };

  const handleUpdate = async (id: string, content: string) => {
    const { error } = await supabase.from("generated_content").update({ content }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["generated_content", moduleId] });
      toast({ title: "Content updated" });
    }
  };

  const handleToggleApproval = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("generated_content").update({ is_approved: approved }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["generated_content", moduleId] });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("generated_content").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["generated_content", moduleId] });
      toast({ title: "Content deleted" });
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
                  <BreadcrumbPage>{module?.title ?? "Module"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {moduleLoading ? (
              <ModuleDetailSkeleton />
            ) : module ? (
              <>
                <h1 className="text-2xl font-bold">{module.title}</h1>
                {module.description && (
                  <p className="text-muted-foreground mt-1 mb-6">{module.description}</p>
                )}
                {!module.description && <div className="mb-6" />}

                <ContentTabs
                  contents={contents}
                  onGenerate={handleGenerate}
                  onUpdate={handleUpdate}
                  onToggleApproval={handleToggleApproval}
                  onDelete={handleDelete}
                  generatingType={generatingType}
                />
              </>
            ) : (
              <p className="text-muted-foreground">Module not found.</p>
            )}
          </main>
        </PageTransition>
      </PageContainer>
    </div>
  );
};

export default ModuleDetail;
