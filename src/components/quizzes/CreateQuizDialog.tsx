import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CreateQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: Array<{ id: string; title: string }>;
  onSubmit: (params: {
    title: string;
    moduleId: string | null;
    questionCount: number;
    questionTypes: string[];
    difficulty: string;
  }) => void;
  isLoading: boolean;
}

const CreateQuizDialog = ({
  open, onOpenChange, modules, onSubmit, isLoading,
}: CreateQuizDialogProps) => {
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState<string>("none");
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState<string[]>(["multiple_choice"]);
  const [difficulty, setDifficulty] = useState("intermediate");

  const toggleType = (type: string) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = () => {
    if (!title.trim() || questionTypes.length === 0) return;
    onSubmit({
      title: title.trim(),
      moduleId: moduleId === "none" ? null : moduleId,
      questionCount: Math.min(30, Math.max(5, questionCount)),
      questionTypes,
      difficulty,
    });
  };

  const resetForm = () => {
    setTitle("");
    setModuleId("none");
    setQuestionCount(10);
    setQuestionTypes(["multiple_choice"]);
    setDifficulty("intermediate");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Quiz</DialogTitle>
          <DialogDescription>Configure quiz parameters and generate questions with AI.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="quiz-title">Quiz Title *</Label>
            <Input
              id="quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Module 3 Review Quiz"
            />
          </div>

          <div className="space-y-2">
            <Label>Module (optional)</Label>
            <Select value={moduleId} onValueChange={setModuleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific module</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-count">Number of Questions (5–30)</Label>
            <Input
              id="question-count"
              type="number"
              min={5}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Question Types</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={questionTypes.includes("multiple_choice")}
                  onCheckedChange={() => toggleType("multiple_choice")}
                />
                Multiple Choice
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={questionTypes.includes("true_false")}
                  onCheckedChange={() => toggleType("true_false")}
                />
                True / False
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Difficulty Level</Label>
            <RadioGroup value={difficulty} onValueChange={setDifficulty} className="flex gap-4">
              {[
                { value: "foundational", label: "Foundational" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ].map((d) => (
                <label key={d.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={d.value} />
                  {d.label}
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || questionTypes.length === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Quiz"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuizDialog;
