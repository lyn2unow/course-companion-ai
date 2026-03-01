import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const MATERIAL_TYPES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "lecture_notes", label: "Lecture Notes" },
  { value: "textbook", label: "Textbook" },
  { value: "quiz_bank", label: "Quiz Bank" },
  { value: "other", label: "Other" },
];

interface PasteContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, content: string, materialType: string) => void;
  isLoading?: boolean;
}

const PasteContentDialog = ({ open, onOpenChange, onSubmit, isLoading }: PasteContentDialogProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [materialType, setMaterialType] = useState("other");

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    onSubmit(title.trim(), content.trim(), materialType);
    setTitle("");
    setContent("");
    setMaterialType("other");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paste Content</DialogTitle>
          <DialogDescription>Paste text content like syllabus, lecture notes, or any course material.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paste-title">Title</Label>
            <Input id="paste-title" placeholder="e.g. Week 1 Lecture Notes" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paste-type">Material Type</Label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger id="paste-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paste-content">Content</Label>
            <Textarea id="paste-content" placeholder="Paste your content here..." value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[200px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !content.trim() || isLoading}>
            {isLoading ? "Saving..." : "Save Content"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasteContentDialog;
