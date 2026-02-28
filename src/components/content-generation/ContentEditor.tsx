import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ContentEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const ContentEditor = ({ initialContent, onSave, onCancel, isSaving }: ContentEditorProps) => {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="font-mono text-sm"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(content)} disabled={isSaving}>
          <Check className="h-4 w-4 mr-1" /> {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
};

export default ContentEditor;
