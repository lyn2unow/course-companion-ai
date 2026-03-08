import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface QuestionCardProps {
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: Json;
    correct_answer: string;
    explanation: string | null;
    sort_order: number;
  };
  index: number;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  points: number;
  onPointsChange: (id: string, pts: number) => void;
}

const QuestionCard = ({
  question, index, onUpdate, onDelete, points, onPointsChange,
}: QuestionCardProps) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.question_text);
  const [explanation, setExplanation] = useState(question.explanation ?? "");

  const options = Array.isArray(question.options)
    ? (question.options as string[])
    : [];

  const typeLabel =
    question.question_type === "true_false" ? "True / False" : "Multiple Choice";

  const handleBlur = () => {
    setEditing(false);
    if (text !== question.question_text || explanation !== (question.explanation ?? "")) {
      onUpdate(question.id, {
        question_text: text,
        explanation: explanation || null,
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">Q{index + 1}</span>
          <Badge variant="secondary" className="text-xs">
            {typeLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              className="w-16 h-7 text-xs"
              value={points}
              onChange={(e) => onPointsChange(question.id, Number(e.target.value))}
            />
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(question.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            className="min-h-[60px]"
          />
        ) : (
          <p
            className="text-sm cursor-pointer hover:bg-muted/30 rounded p-1 -m-1"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {question.question_text}
          </p>
        )}

        <div className="space-y-1">
          {options.map((opt, i) => {
            const isCorrect =
              String(opt).trim().toLowerCase() ===
              String(question.correct_answer).trim().toLowerCase();
            return (
              <div
                key={i}
                className={`text-sm px-3 py-1.5 rounded border ${
                  isCorrect
                    ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200"
                    : "border-border"
                }`}
              >
                {String(opt)}
                {isCorrect && <span className="ml-2 text-xs font-medium">✓ Correct</span>}
              </div>
            );
          })}
        </div>

        {editing ? (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Explanation</span>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              onBlur={handleBlur}
              className="mt-1 min-h-[40px] text-xs"
            />
          </div>
        ) : question.explanation ? (
          <div
            className="cursor-pointer hover:bg-muted/30 rounded p-1 -m-1"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            <span className="text-xs font-medium text-muted-foreground">Explanation: </span>
            <span className="text-xs text-muted-foreground">{question.explanation}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default QuestionCard;
