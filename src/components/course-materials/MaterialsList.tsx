import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, FileText, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

interface Material {
  id: string;
  file_name: string;
  material_type: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  extracted_text: string | null;
}

interface MaterialsListProps {
  materials: Material[];
  onDelete: (id: string) => void;
  isDeleting?: string | null;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeLabels: Record<string, string> = {
  syllabus: "Syllabus",
  lecture_notes: "Lecture Notes",
  textbook: "Textbook",
  quiz_bank: "Quiz Bank",
  spreadsheet: "Spreadsheet",
  other: "Other",
};

const MaterialsList = ({ materials, onDelete, isDeleting }: MaterialsListProps) => {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No materials uploaded yet. Upload files or paste content to feed the AI generator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {materials.map((m) => (
        <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">{typeLabels[m.material_type] ?? m.material_type}</Badge>
                {m.file_size ? <span>{formatSize(m.file_size)}</span> : null}
                <span>{format(new Date(m.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {m.extracted_text ? (
              <CheckCircle2 className="h-4 w-4 text-accent" aria-label="Text extracted" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" aria-label="Processing" />
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(m.id)} disabled={isDeleting === m.id} aria-label="Delete material">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MaterialsList;
