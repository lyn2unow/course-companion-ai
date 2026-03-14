import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AppHeader from "@/components/layout/AppHeader";
import PageContainer from "@/components/layout/PageContainer";
import PageTransition from "@/components/layout/PageTransition";
import StepIndicator from "@/components/course-setup/StepIndicator";
import CourseBasicInfo, { type BasicInfoData } from "@/components/course-setup/CourseBasicInfo";
import CoursePhilosophy, { type PhilosophyData } from "@/components/course-setup/CoursePhilosophy";
import CourseMaterials, { type PendingFile } from "@/components/course-setup/CourseMaterials";
import CourseReview from "@/components/course-setup/CourseReview";
import CourseObjectives from "@/components/course-setup/CourseObjectives";

const STEP_LABELS = ["Basic Info", "Philosophy", "Materials", "Review", "Objectives"];

const CourseSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [courseIdForExtraction, setCourseIdForExtraction] = useState<string | null>(null);

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

      for (const pf of files) {
        const storagePath = `${user.id}/${course.id}/${Date.now()}_${pf.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("course-materials")
          .upload(storagePath, pf.file);

        if (uploadError) {
          console.error("File upload error:", uploadError);
          continue;
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

        // Await text extraction so extracted_text is ready before objective extraction
        await supabase.functions.invoke("parse-content", {
          body: { storagePath, courseId: course.id },
        });

        // Diagnostic — remove after debugging
        const { data: matCheck } = await supabase
          .from("course_materials")
          .select("file_name, extracted_text")
          .eq("course_id", course.id)
          .eq("material_type", "syllabus")
          .single();
        toast({
          title: `parse-content result for ${matCheck?.file_name}`,
          description: matCheck?.extracted_text
            ? `extracted_text: ${matCheck.extracted_text.slice(0, 100)}`
            : "extracted_text is NULL",
        });
      }

      setCourseIdForExtraction(course.id);
      setStep(5);

      // Wait briefly for parse-content to process, then extract objectives
      const hasSyllabus = files.some((f) => f.materialType === "syllabus");
      if (hasSyllabus) {
        setIsExtracting(true);
        try {
          const { data, error } = await supabase.functions.invoke("extract-objectives", {
            body: { courseId: course.id, courseName: basicInfo.name },
          });
          if (error) {
            toast({
              title: "Extraction error",
              description: JSON.stringify(error),
              variant: "destructive",
            });
          } else if (!data?.objectives?.length) {
            toast({
              title: "No objectives returned",
              description: `Data received: ${JSON.stringify(data)}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: `Extracted ${data.objectives.length} objectives`,
              description: data.objectives[0],
            });
            setObjectives(data.objectives);
          }
        } catch (err: any) {
          toast({
            title: "Extraction exception",
            description: err.message ?? String(err),
            variant: "destructive",
          });
        } finally {
          setIsExtracting(false);
        }
      }
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

  const handleFinish = async (finalObjectives: string[]) => {
    if (!courseIdForExtraction) {
      navigate("/dashboard");
      return;
    }
    toast({
      title: "Course created!",
      description: `"${basicInfo.name}" is ready. Add your first module to apply objectives.`,
    });
    navigate(`/courses/${courseIdForExtraction}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer className="max-w-2xl">
        <PageTransition>
          <main id="main-content">
            <h1 className="text-2xl font-bold mb-2">Create New Course</h1>
            <p className="text-muted-foreground mb-8">Set up your course in a few quick steps.</p>

            <StepIndicator currentStep={step} totalSteps={5} labels={STEP_LABELS} />

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
            {step === 5 && (
              <CourseObjectives
                objectives={objectives}
                isExtracting={isExtracting}
                onNext={handleFinish}
                onBack={() => setStep(3)}
              />
            )}
          </main>
        </PageTransition>
      </PageContainer>
    </div>
  );
};

export default CourseSetup;
