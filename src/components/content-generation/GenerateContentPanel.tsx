import { FileText, BookOpen, MessageSquare, BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentCard from "./ContentCard";

interface ContentItem {
  id: string;
  content: string;
  content_type: string;
  is_approved: boolean;
  human_reviewed: boolean;
  human_reviewed_at: string | null;
  edited_content: string | null;
  version: number;
  created_at: string;
}

interface GenerateContentPanelProps {
  contents: ContentItem[];
  onGenerate: (contentType: string) => void;
  onAutoSave: (id: string, editedContent: string) => Promise<void>;
  onToggleReviewed: (id: string, reviewed: boolean) => void;
  onRegenerate: (id: string, contentType: string, currentVersion: number) => void;
  onDelete: (id: string) => void;
  generatingType: string | null;
}

const CONTENT_TYPES = [
  { value: "lecture_notes", label: "Lecture Notes", icon: FileText },
  { value: "key_terms", label: "Key Terms & Glossary", icon: BookOpen },
  { value: "discussion_prompt", label: "Discussion Prompts", icon: MessageSquare },
  { value: "reading_guide", label: "Reading Guide", icon: BookMarked },
];

const GenerateContentPanel = ({
  contents,
  onGenerate,
  onAutoSave,
  onToggleReviewed,
  onRegenerate,
  onDelete,
  generatingType,
}: GenerateContentPanelProps) => {
  const isGenerating = generatingType !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Generate Content</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CONTENT_TYPES.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant="outline"
              className="h-auto flex-col gap-2 py-4 border-accent/30 hover:border-accent hover:bg-accent/10 text-foreground"
              onClick={() => onGenerate(value)}
              disabled={isGenerating}
            >
              {generatingType === value ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : (
                <Icon className="h-5 w-5 text-accent" />
              )}
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {contents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {contents.length} item{contents.length !== 1 ? "s" : ""} generated
          </h2>
          {contents.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              onAutoSave={onAutoSave}
              onToggleReviewed={onToggleReviewed}
              onDelete={onDelete}
              onRegenerate={() => onRegenerate(item.id, item.content_type, item.version)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GenerateContentPanel;
