import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import ContentEditor from "./ContentEditor";
import ExportMenu from "./ExportMenu";
import { format } from "date-fns";

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
  const [editing, setEditing] = useState(false);

  return (
    <Card className={item.is_approved ? "border-accent/50" : ""}>
      <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
          </CardTitle>
          {item.is_approved && <Badge variant="secondary" className="text-xs">Approved</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 mr-2">
            <Label htmlFor={`approve-${item.id}`} className="text-xs text-muted-foreground">Approve</Label>
            <Switch
              id={`approve-${item.id}`}
              checked={item.is_approved}
              onCheckedChange={(checked) => onToggleApproval(item.id, checked)}
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerate} aria-label="Regenerate">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <ExportMenu content={item.content} contentType={item.content_type} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {editing ? (
          <ContentEditor
            initialContent={item.content}
            onSave={(newContent) => {
              onUpdate(item.id, newContent);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
            isSaving={isUpdating}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
            {item.content}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContentCard;
