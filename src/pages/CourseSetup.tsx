import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import StepIndicator from "@/components/course-setup/StepIndicator";
import CourseBasicInfo, { type BasicInfoData } from "@/components/course-setup/CourseBasicInfo";
import CoursePhilosophy, { type PhilosophyData } from "@/components/course-setup/CoursePhilosophy";
import CourseMaterials, { type PendingFile } from "@/components/course-setup/CourseMaterials";
import CourseReview from "@/components/course-setup/CourseReview";

const STEP_LABELS = ["Basic Info", "Philosophy", "Materials", "Review"];

const CourseSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    name: "",
    description: "",
    institution: "",
    semester: "",
  });

  const [philosophy, setPhilosophy] = useState<PhilosophyData>({
    teachingPhilosophy: "",
    sourceHierarchy: [],
  });

  const [files, setFiles] = useState<PendingFile[]>([]);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      // 1. Insert course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          user_id: user.id,
          name: basicInfo.name,
          description: basicInfo.description || null,
          institution: basicInfo.institution || null,
          semester: basicInfo.semester || null,
          teaching_philosophy: philosophy.teachingPhilosophy || null,
          source_hierarchy: philosophy.sourceHierarchy,
        })
        .select("id")
        .single();

      if (courseError) throw courseError;

      // 2. Upload files and insert metadata
      for (const pf of files) {
        const storagePath = `${user.id}/${course.id}/${Date.now()}_${pf.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(storagePath, pf.file);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          continue; // non-blocking — still create the course
        }

        await supabase.from("course_materials").insert({
          user_id: user.id,
          course_id: course.id,
          file_name: pf.file.name,
          file_size: pf.file.size,
          file_type: pf.file.type || null,
          material_type: pf.materialType,
          storage_path: storagePath,
        });
      }

      toast({
        title: "Course created!",
        description: `"${basicInfo.name}" is ready. You can now add modules and content.`,
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error creating course",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Create New Course</h1>
        <p className="text-muted-foreground mb-8">Set up your course in a few quick steps.</p>

        <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />

        {step === 1 && (
          <CourseBasicInfo
            data={basicInfo}
            onNext={(d) => { setBasicInfo(d); setStep(2); }}
          />
        )}
        {step === 2 && (
          <CoursePhilosophy
            data={philosophy}
            onNext={(d) => { setPhilosophy(d); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <CourseMaterials
            files={files}
            onNext={(f) => { setFiles(f); setStep(4); }}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <CourseReview
            basicInfo={basicInfo}
            philosophy={philosophy}
            files={files}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </PageContainer>
    </div>
  );
};

export default CourseSetup;
