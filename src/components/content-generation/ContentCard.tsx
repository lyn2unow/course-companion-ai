import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, RefreshCw, Copy, CheckCircle, Eye, Pencil } from "lucide-react";
import ExportMenu from "./ExportMenu";
import DeleteContentDialog from "./DeleteContentDialog";
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
    human_reviewed: boolean;
    human_reviewed_at: string | null;
    edited_content: string | null;
    version: number;
    created_at: string;
  };
  onAutoSave: (id: string, editedContent: string) => Promise<void>;
  onToggleReviewed: (id: string, reviewed: boolean) => void;
  onDelete: (id: string) => void;
  onRegenerate: () => void;
}

const ContentCard = ({ content: item, onAutoSave, onToggleReviewed, onDelete, onRegenerate }: ContentCardProps) => {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editText, setEditText] = useState(item.edited_content ?? item.content);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync edit text when content changes externally (e.g. after regenerate)
  useEffect(() => {
    setEditText(item.edited_content ?? item.content);
  }, [item.content, item.edited_content]);

  const debouncedSave = useCallback(
    (newText: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaveStatus("idle");

      debounceRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          await onAutoSave(item.id, newText);
          setSaveStatus("saved");
          savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 1000);
    },
    [item.id, onAutoSave]
  );

  const handleEditChange = (value: string) => {
    setEditText(value);
    debouncedSave(value);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(item.edited_content ?? item.content);
    toast({ title: "Copied to clipboard" });
  };

  const displayContent = item.edited_content ?? item.content;
  const typeLabel = CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type;

  return (
    <>
      <Card className={item.human_reviewed ? "border-accent/50" : ""}>
        <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium">{typeLabel}</CardTitle>
            <span className="text-xs text-muted-foreground">
              {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
            </span>
            {item.version > 1 && (
              <Badge variant="outline" className="text-xs">v{item.version}</Badge>
            )}
            {item.human_reviewed ? (
              <Badge variant="outline" className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3" /> Reviewed ✓
              </Badge>
            ) : (
              <Badge className="text-xs bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">
                AI Generated — Review Before Use
              </Badge>
            )}
            {saveStatus === "saving" && (
              <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-xs text-accent">Saved</span>
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
              <Label htmlFor={`reviewed-${item.id}`} className="text-xs text-muted-foreground">Mark as Reviewed</Label>
              <Switch
                id={`reviewed-${item.id}`}
                checked={item.human_reviewed}
                onCheckedChange={(checked) => onToggleReviewed(item.id, checked)}
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy} aria-label="Copy to clipboard">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerate} aria-label="Regenerate">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ExportMenu content={displayContent} contentType={item.content_type} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {mode === "edit" ? (
            <Textarea
              value={editText}
              onChange={(e) => handleEditChange(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
          ) : (
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteContentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          onDelete(item.id);
          setDeleteOpen(false);
        }}
      />
    </>
  );
};

export default ContentCard;
