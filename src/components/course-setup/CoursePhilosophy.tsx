import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SourceHierarchyEditor from "./SourceHierarchyEditor";

export interface PhilosophyData {
  teachingPhilosophy: string;
  sourceHierarchy: string[];
}

interface Props {
  data: PhilosophyData;
  onNext: (data: PhilosophyData) => void;
  onBack: () => void;
}

const DEFAULT_SOURCES = ["Textbook", "Syllabus", "Lecture Notes"];

const CoursePhilosophy = ({ data, onNext, onBack }: Props) => {
  const [philosophy, setPhilosophy] = useState(data.teachingPhilosophy);
  const [sources, setSources] = useState<string[]>(
    data.sourceHierarchy.length > 0 ? data.sourceHierarchy : DEFAULT_SOURCES
  );

  const handleSubmit = () => {
    onNext({ teachingPhilosophy: philosophy, sourceHierarchy: sources });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="philosophy">Teaching Philosophy</Label>
        <Textarea
          id="philosophy"
          placeholder="Describe your teaching approach, priorities, and style..."
          rows={4}
          value={philosophy}
          onChange={(e) => setPhilosophy(e.target.value)}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground">Optional — helps the AI tailor generated content to your style.</p>
      </div>

      <div className="space-y-2">
        <Label>Source Material Hierarchy</Label>
        <SourceHierarchyEditor sources={sources} onChange={setSources} />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={handleSubmit}>Next</Button>
      </div>
    </div>
  );
};

export default CoursePhilosophy;
