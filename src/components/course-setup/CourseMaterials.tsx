import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, FileText } from "lucide-react";

export interface PendingFile {
  file: File;
  materialType: string;
}

interface Props {
  files: PendingFile[];
  onNext: (files: PendingFile[]) => void;
  onBack: () => void;
}

const MATERIAL_TYPES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "lecture_notes", label: "Lecture Notes" },
  { value: "textbook", label: "Textbook" },
  { value: "other", label: "Other" },
];

const CourseMaterials = ({ files: initialFiles, onNext, onBack }: Props) => {
  const [files, setFiles] = useState<PendingFile[]>(initialFiles);
  const [materialType, setMaterialType] = useState("syllabus");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles: PendingFile[] = Array.from(selected).map((file) => ({
      file,
      materialType,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const remove = (i: number) => setFiles(files.filter((_, idx) => idx !== i));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Upload Course Materials</Label>
        <p className="text-xs text-muted-foreground">
          Upload syllabi, lecture notes, or textbook files. You can also add materials later. Supported formats: PDF, DOCX, TXT.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="material-type" className="text-xs">Material Type</Label>
          <Select value={materialType} onValueChange={setMaterialType}>
            <SelectTrigger id="material-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" /> Choose Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {MATERIAL_TYPES.find((t) => t.value === f.materialType)?.label} · {formatSize(f.file.size)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {files.some((f) => f.materialType === "syllabus") && (
        <p className="text-xs text-muted-foreground italic">
          For scanned PDFs, use a text-based PDF or paste your syllabus content directly in the next step.
        </p>
      )}

      {files.length === 0 && (
        <div className="rounded-md border border-dashed border-muted-foreground/30 p-8 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No files uploaded yet. You can skip this step and add materials later.</p>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="button" onClick={() => onNext(files)}>
          {files.length > 0 ? "Next" : "Skip & Continue"}
        </Button>
      </div>
    </div>
  );
};

export default CourseMaterials;
