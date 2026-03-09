import { format } from "date-fns";
import { X, Copy, Maximize2, Trash2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

interface MaterialPreviewPanelProps {
  material: Material | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialTypes: { value: string; label: string }[];
  onUpdateType: (id: string, newType: string) => void;
  onDelete: (id: string) => void;
  onReExtract?: (storagePath: string, courseId: string) => Promise<void>;
  courseId?: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MaterialPreviewPanel = ({
  material, open, onOpenChange, materialTypes, onUpdateType, onDelete, onReExtract, courseId,
}: MaterialPreviewPanelProps) => {
  const { toast } = useToast();
  const [fullView, setFullView] = useState(false);
  const [reExtracting, setReExtracting] = useState(false);

  if (!material) return null;

  const typeLabel = materialTypes.find((t) => t.value === material.material_type)?.label ?? material.material_type;
  const previewText = material.extracted_text?.slice(0, 2000) ?? "";

  const handleCopy = async () => {
    if (!material.extracted_text) return;
    await navigator.clipboard.writeText(material.extracted_text);
    toast({ title: "Copied to clipboard" });
  };

  const handleDelete = () => {
    onDelete(material.id);
    onOpenChange(false);
  };

  const handleReExtract = async () => {
    if (!onReExtract || !courseId) return;
    setReExtracting(true);
    try {
      await onReExtract(material.storage_path, courseId);
      toast({ title: "Re-extraction triggered", description: "Text will be updated shortly." });
    } catch {
      toast({ title: "Re-extraction failed", variant: "destructive" });
    } finally {
      setReExtracting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="text-base font-semibold truncate pr-6">
              {material.file_name}
            </SheetTitle>
            <SheetDescription className="sr-only">Preview of {material.file_name}</SheetDescription>
            <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
              <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>
              {material.file_size ? <span>{formatSize(material.file_size)}</span> : null}
              <span>{format(new Date(material.created_at), "MMM d, yyyy")}</span>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 p-6">
            {previewText ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Extracted Text (used by AI)
                </p>
                <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded-md text-foreground leading-relaxed">
                  {previewText}
                  {material.extracted_text && material.extracted_text.length > 2000 && (
                    <span className="text-muted-foreground">… ({material.extracted_text.length - 2000} more characters)</span>
                  )}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Text not yet extracted — upload a file to enable AI generation</p>
              </div>
            )}
          </ScrollArea>

          <div className="border-t border-border p-4 flex items-center gap-2 flex-wrap">
            {material.extracted_text && (
              <>
                <Button variant="outline" size="sm" onClick={() => setFullView(true)}>
                  <Maximize2 className="h-4 w-4 mr-1" /> Full view
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" /> Copy text
                </Button>
              </>
            )}

            {onReExtract && courseId && (
              <Button variant="outline" size="sm" onClick={handleReExtract} disabled={reExtracting}>
                <RotateCw className={`h-4 w-4 mr-1 ${reExtracting ? "animate-spin" : ""}`} /> Re-extract
              </Button>
            )}

            <Select value={material.material_type} onValueChange={(v) => onUpdateType(material.id, v)}>
              <SelectTrigger className="h-8 w-auto gap-1 text-xs px-2">
                <SelectValue>{typeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="ml-auto">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete material?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove "{material.file_name}" and its extracted text.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={fullView} onOpenChange={setFullView}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{material.file_name} — Full Extracted Text</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <pre className="text-xs font-mono whitespace-pre-wrap p-4 text-foreground leading-relaxed">
              {material.extracted_text}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MaterialPreviewPanel;
