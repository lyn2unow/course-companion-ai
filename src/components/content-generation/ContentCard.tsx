import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, RefreshCw, Copy, CheckCircle, Eye } from "lucide-react";
import ContentEditor from "./ContentEditor";
import ExportMenu from "./ExportMenu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture Notes",
  key_terms: "Key Terms & Glossary",
  discussion_prompt: "Discussion Prompts",
  reading_guide: "Reading Guide",
};

interface ContentCardProps {
  content: {
    id: string;
    content: string;
    content_type: string;
    is_approved: boolean;
    created_at: string;
  };
  onUpdate: (id: string, content: string) => void;
  onToggleApproval: (id: string, approved: boolean) => void;
  onDelete: (id: string) => void;
  onRegenerate: () => void;
  isUpdating?: boolean;
}

const ContentCard = ({ content: item, onUpdate, onToggleApproval, onDelete, onRegenerate, isUpdating }: ContentCardProps) => {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.content);
    toast({ title: "Copied to clipboard" });
  };

  const typeLabel = CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type;

  return (
    <Card className={item.is_approved ? "border-accent/50" : ""}>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-sm font-medium">{typeLabel}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
          </span>
          {item.is_approved ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <CheckCircle className="h-3 w-3" /> Reviewed
            </Badge>
          ) : (
            <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
              AI Generated — Review Before Use
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Preview / Edit toggle */}
          <div className="flex items-center border border-border rounded-md mr-1">
            <Button
              variant={mode === "preview" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-r-none"
              onClick={() => setMode("preview")}
              aria-label="Preview mode"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={mode === "edit" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-l-none"
              onClick={() => setMode("edit")}
              aria-label="Edit mode"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mr-2">
            <Label htmlFor={`approve-${item.id}`} className="text-xs text-muted-foreground">Mark as Reviewed</Label>
            <Switch
              id={`approve-${item.id}`}
              checked={item.is_approved}
              onCheckedChange={(checked) => onToggleApproval(item.id, checked)}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} aria-label="Copy to clipboard">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerate} aria-label="Regenerate">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ExportMenu content={item.content} contentType={item.content_type} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.id)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {mode === "edit" ? (
          <ContentEditor
            initialContent={item.content}
            onSave={(newContent) => {
              onUpdate(item.id, newContent);
              setMode("preview");
            }}
            onCancel={() => setMode("preview")}
            isSaving={isUpdating}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-foreground">
            <ReactMarkdown>{item.content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContentCard;
