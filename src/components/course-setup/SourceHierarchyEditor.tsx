import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, X, Plus } from "lucide-react";

interface SourceHierarchyEditorProps {
  sources: string[];
  onChange: (sources: string[]) => void;
}

const SourceHierarchyEditor = ({ sources, onChange }: SourceHierarchyEditorProps) => {
  const [newSource, setNewSource] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const next = [...sources];
    const [dragged] = next.splice(dragItem.current, 1);
    next.splice(dragOverItem.current, 0, dragged);
    onChange(next);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const remove = (i: number) => onChange(sources.filter((_, idx) => idx !== i));

  const add = () => {
    const trimmed = newSource.trim();
    if (trimmed && !sources.includes(trimmed)) {
      onChange([...sources, trimmed]);
      setNewSource("");
    }
  };

  const startEdit = (i: number) => {
    setEditingIdx(i);
    setEditVal(sources[i]);
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== sources[editingIdx]) {
      const next = [...sources];
      next[editingIdx] = trimmed;
      onChange(next);
    }
    setEditingIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {sources.map((source, i) => (
          <div
            key={`${source}-${i}`}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 cursor-grab active:cursor-grabbing hover:border-muted-foreground/40 transition-colors"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-muted-foreground w-5 shrink-0">{i + 1}.</span>
            {editingIdx === i ? (
              <Input
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                autoFocus
                className="h-7 text-sm flex-1"
              />
            ) : (
              <span
                className="flex-1 text-sm cursor-pointer hover:text-muted-foreground"
                onClick={() => startEdit(i)}
                title="Click to rename"
              >
                {source}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive shrink-0"
              onClick={() => remove(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add a source type..."
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!newSource.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag to reorder. The AI will prioritize sources at the top when generating content.
      </p>
    </div>
  );
};

export default SourceHierarchyEditor;
