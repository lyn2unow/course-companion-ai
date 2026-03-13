import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2, Sparkles } from "lucide-react";

interface Props {
  objectives: string[];
  isExtracting: boolean;
  onNext: (objectives: string[]) => void;
  onBack: () => void;
}

const CourseObjectives = ({ objectives: initial, isExtracting, onNext, onBack }: Props) => {
  const [objectives, setObjectives] = useState<string[]>(
    initial.length > 0 ? initial : [""]
  );

  const update = (i: number, val: string) =>
    setObjectives(objectives.map((o, idx) => (idx === i ? val : o)));

  const remove = (i: number) =>
    setObjectives(objectives.filter((_, idx) => idx !== i));

  const add = () => setObjectives([...objectives, ""]);

  const handleNext = () => {
    const clean = objectives.map((o) => o.trim()).filter(Boolean);
    onNext(clean);
  };

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>Reading your syllabus and extracting learning objectives...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Learning Objectives</Label>
        {initial.length > 0 ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Extracted from your syllabus — review and edit as needed.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No syllabus uploaded. Add your learning objectives manually.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={obj}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Objective ${i + 1}`}
              className="flex-1"
            />
            {objectives.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" />
        Add objective
      </Button>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
};

export default CourseObjectives;
