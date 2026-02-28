import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";

export interface PhilosophyData {
  teachingPhilosophy: string;
  sourceHierarchy: string[];
}

interface Props {
  data: PhilosophyData;
  onNext: (data: PhilosophyData) => void;
  onBack: () => void;
}

const DEFAULT_SOURCES = ["Statutes", "Exam Handbook", "Textbook", "Lecture Notes"];

const CoursePhilosophy = ({ data, onNext, onBack }: Props) => {
  const [philosophy, setPhilosophy] = useState(data.teachingPhilosophy);
  const [sources, setSources] = useState<string[]>(
    data.sourceHierarchy.length > 0 ? data.sourceHierarchy : DEFAULT_SOURCES
  );
  const [newSource, setNewSource] = useState("");

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...sources];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setSources(next);
  };

  const moveDown = (i: number) => {
    if (i === sources.length - 1) return;
    const next = [...sources];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setSources(next);
  };

  const remove = (i: number) => setSources(sources.filter((_, idx) => idx !== i));

  const add = () => {
    const trimmed = newSource.trim();
    if (trimmed && !sources.includes(trimmed)) {
      setSources([...sources, trimmed]);
      setNewSource("");
    }
  };

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

      <div className="space-y-3">
        <Label>Source Material Hierarchy</Label>
        <p className="text-xs text-muted-foreground">
          Rank your source materials by priority. The AI will prefer higher-ranked sources when generating content.
        </p>
        <div className="space-y-2">
          {sources.map((source, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
              <span className="flex-1 text-sm">{source}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveUp(i)} disabled={i === 0}>
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveDown(i)} disabled={i === sources.length - 1}>
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a source type..."
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          />
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={!newSource.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={handleSubmit}>Next</Button>
      </div>
    </div>
  );
};

export default CoursePhilosophy;
