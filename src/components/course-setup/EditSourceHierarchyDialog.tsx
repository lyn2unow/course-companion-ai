import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SourceHierarchyEditor from "@/components/course-setup/SourceHierarchyEditor";

interface EditSourceHierarchyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: string[];
  onSave: (sources: string[]) => Promise<void>;
}

const EditSourceHierarchyDialog = ({
  open, onOpenChange, sources, onSave,
}: EditSourceHierarchyDialogProps) => {
  const [localSources, setLocalSources] = useState<string[]>(sources);
  const [saving, setSaving] = useState(false);

  const handleOpen = (o: boolean) => {
    if (o) setLocalSources(sources);
    onOpenChange(o);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSources);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Source Hierarchy</DialogTitle>
          <DialogDescription>Reorder, rename, or add source types for AI content generation.</DialogDescription>
        </DialogHeader>
        <SourceHierarchyEditor sources={localSources} onChange={setLocalSources} />
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSourceHierarchyDialog;
