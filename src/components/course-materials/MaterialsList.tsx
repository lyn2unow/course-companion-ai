import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, Eye } from "lucide-react";
import { format } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import MaterialPreviewPanel from "./MaterialPreviewPanel";

interface Material {
  id: string;
  file_name: string;
  material_type: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  extracted_text: string | null;
  storage_path: string;
}

interface MaterialsListProps {
  materials: Material[];
  materialTypes: { value: string; label: string }[];
  onDelete: (id: string) => void;
  onUpdateType: (id: string, newType: string) => void;
  onReExtract?: (storagePath: string, courseId: string) => Promise<void>;
  courseId: string;
  isDeleting?: string | null;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Extraction status dot */
const ExtractionDot = ({ text }: { text: string | null }) => {
  if (!text) {
    // Gray = not yet processed
    return (
      <span className="relative flex h-2.5 w-2.5" title="Not yet processed">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      </span>
    );
  }
  const isScanned = text.startsWith("[SCANNED PDF") || text.startsWith("[Unable") || text.startsWith("[Failed") || text.startsWith("[PDF text") || text.startsWith("[DOCX extraction") || text.startsWith("[Spreadsheet") || text.startsWith("[QTI extraction");
  if (isScanned) {
    // Yellow = scanned / no usable text
    return (
      <span className="relative flex h-2.5 w-2.5" title="Scanned/no text extracted">
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
      </span>
    );
  }
  // Green = extracted successfully
  return (
    <span className="relative flex h-2.5 w-2.5" title="Text extracted">
      <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
    </span>
  );
};

const MaterialsList = ({ materials, materialTypes, onDelete, onUpdateType, onReExtract, courseId, isDeleting }: MaterialsListProps) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No materials uploaded yet. Upload files or paste content to feed the AI generator.</p>
      </div>
    );
  }

  const handleTypeChange = async (id: string, newType: string) => {
    setUpdatingId(id);
    await onUpdateType(id, newType);
    setUpdatingId(null);
  };

  const getLabel = (value: string) =>
    materialTypes.find((t) => t.value === value)?.label ?? value;

  return (
    <div className="space-y-2">
      {materials.map((m) => (
        <div
          key={m.id}
          className={`flex items-center justify-between p-3 rounded-lg border bg-card cursor-pointer transition-colors hover:bg-muted/50 ${updatingId === m.id ? "opacity-60" : ""}`}
          onClick={() => setPreviewMaterial(m)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Select value={m.material_type} onValueChange={(v) => handleTypeChange(m.id, v)}>
                  <SelectTrigger
                    className="h-5 w-auto gap-1 border-none bg-secondary text-secondary-foreground rounded-full px-2 py-0 text-xs font-semibold hover:bg-secondary/80 focus:ring-0 focus:ring-offset-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SelectValue>{getLabel(m.material_type)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {materialTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {m.file_size ? <span>{formatSize(m.file_size)}</span> : null}
                <span>{format(new Date(m.created_at), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ExtractionDot text={m.extracted_text} />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); setPreviewMaterial(m); }}
              aria-label="Preview material"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(m.id); }}
              disabled={isDeleting === m.id}
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <MaterialPreviewPanel
        material={previewMaterial}
        open={!!previewMaterial}
        onOpenChange={(open) => { if (!open) setPreviewMaterial(null); }}
        materialTypes={materialTypes}
        onUpdateType={onUpdateType}
        onDelete={onDelete}
        onReExtract={onReExtract}
        courseId={courseId}
      />
    </div>
  );
};

export default MaterialsList;
