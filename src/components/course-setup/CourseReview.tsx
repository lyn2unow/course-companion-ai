import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import type { BasicInfoData } from "./CourseBasicInfo";
import type { PhilosophyData } from "./CoursePhilosophy";
import type { PendingFile } from "./CourseMaterials";

interface Props {
  basicInfo: BasicInfoData;
  philosophy: PhilosophyData;
  files: PendingFile[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const MATERIAL_LABELS: Record<string, string> = {
  syllabus: "Syllabus",
  lecture_notes: "Lecture Notes",
  textbook: "Textbook",
  other: "Other",
};

const CourseReview = ({ basicInfo, philosophy, files, onBack, onSubmit, isSubmitting }: Props) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Course Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Name" value={basicInfo.name} />
          {basicInfo.description && <Row label="Description" value={basicInfo.description} />}
          {basicInfo.institution && <Row label="Institution" value={basicInfo.institution} />}
          {basicInfo.semester && <Row label="Semester" value={basicInfo.semester} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Teaching & Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {philosophy.teachingPhilosophy ? (
            <p className="text-muted-foreground">{philosophy.teachingPhilosophy}</p>
          ) : (
            <p className="text-muted-foreground italic">No teaching philosophy provided.</p>
          )}
          {philosophy.sourceHierarchy.length > 0 && (
            <div className="pt-2">
              <p className="font-medium mb-1">Source Hierarchy:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-0.5">
                {philosophy.sourceHierarchy.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Materials ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length > 0 ? (
            <div className="space-y-1.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{f.file.name}</span>
                  <span className="text-muted-foreground">({MATERIAL_LABELS[f.materialType] || f.materialType})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No materials uploaded.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Course
        </Button>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex gap-2">
    <span className="font-medium min-w-24">{label}:</span>
    <span className="text-muted-foreground">{value}</span>
  </div>
);

export default CourseReview;
