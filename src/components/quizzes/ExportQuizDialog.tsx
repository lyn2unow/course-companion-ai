import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info, Loader2 } from "lucide-react";

const LMS_OPTIONS = [
  { value: "qti_canvas", lms: "Canvas", format: "QTI 1.2 (.zip)", badge: "ZIP" },
  { value: "qti_blackboard", lms: "Blackboard", format: "QTI 1.2 (.zip)", badge: "ZIP" },
  { value: "gift_moodle", lms: "Moodle", format: "GIFT format (.txt)", badge: "TXT" },
  { value: "qti_brightspace", lms: "Brightspace / D2L", format: "QTI 1.2 (.zip)", badge: "ZIP" },
  { value: "qti_schoology", lms: "Schoology", format: "QTI 2.1 (.zip)", badge: "ZIP" },
  { value: "csv", lms: "Universal / Other", format: "CSV (.csv) — works in any LMS", badge: "CSV" },
] as const;

interface ExportQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: string) => Promise<void>;
  isExporting: boolean;
}

const ExportQuizDialog = ({ open, onOpenChange, onExport, isExporting }: ExportQuizDialogProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleExport = async () => {
    if (!selected) return;
    await onExport(selected);
    setSelected(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelected(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Quiz</DialogTitle>
          <DialogDescription>Choose your LMS to download the correct format</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {LMS_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                disabled={isExporting}
                className={`flex items-center justify-between w-full rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                }`}
              >
                <div>
                  <span className="text-sm font-semibold">{opt.lms}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.format}</p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
                  {opt.badge}
                </Badge>
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Tip: If your LMS isn't listed, use Universal CSV — it works everywhere.</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selected || isExporting}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              "Export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportQuizDialog;
