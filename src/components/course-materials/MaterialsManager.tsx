import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, ClipboardPaste } from "lucide-react";
import MaterialsList from "./MaterialsList";
import PasteContentDialog from "./PasteContentDialog";

const DEFAULT_MATERIAL_TYPES = [
  { value: "syllabus", label: "Syllabus" },
  { value: "lecture_notes", label: "Lecture Notes" },
  { value: "textbook", label: "Textbook" },
  { value: "quiz_bank", label: "Quiz Bank" },
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "other", label: "Other" },
];

const ACCEPTED_TYPES = ".pdf,.docx,.doc,.txt,.xls,.xlsx,.zip,.qti";

interface MaterialsManagerProps {
  courseId: string;
  sourceHierarchy?: string[];
}

const MaterialsManager = ({ courseId, sourceHierarchy = [] }: MaterialsManagerProps) => {
  // Build material types: defaults + custom source hierarchy entries
  const materialTypes = (() => {
    const defaultValues = DEFAULT_MATERIAL_TYPES.map((t) => t.value);
    const custom = sourceHierarchy
      .filter((s) => !defaultValues.includes(s.toLowerCase().replace(/\s+/g, "_")))
      .map((s) => ({
        value: s.toLowerCase().replace(/\s+/g, "_"),
        label: s,
      }));
    return [...DEFAULT_MATERIAL_TYPES, ...custom];
  })();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [materialType, setMaterialType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteSaving, setPasteSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: materials = [] } = useQuery({
    queryKey: ["course_materials", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_materials")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!courseId,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const storagePath = `${user.id}/${courseId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("course-materials").upload(storagePath, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("course_materials").insert({
          course_id: courseId,
          user_id: user.id,
          file_name: file.name,
          file_type: file.type || file.name.split(".").pop() || "unknown",
          file_size: file.size,
          material_type: materialType,
          storage_path: storagePath,
        });
        if (insertError) throw insertError;

        // Trigger text extraction
        supabase.functions.invoke("parse-content", { body: { storagePath, courseId } }).catch(console.error);
      }
      queryClient.invalidateQueries({ queryKey: ["course_materials", courseId] });
      toast({ title: "Files uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePasteSubmit = async (title: string, content: string, type: string) => {
    if (!user) return;
    setPasteSaving(true);
    try {
      // Store pasted text as a text file in storage
      const blob = new Blob([content], { type: "text/plain" });
      const storagePath = `${user.id}/${courseId}/${Date.now()}_${title}.txt`;
      const { error: uploadError } = await supabase.storage.from("course-materials").upload(storagePath, blob);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("course_materials").insert({
        course_id: courseId,
        user_id: user.id,
        file_name: title,
        file_type: "text/plain",
        file_size: blob.size,
        material_type: type,
        storage_path: storagePath,
        extracted_text: content,
      } as any);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["course_materials", courseId] });
      setPasteOpen(false);
      toast({ title: "Content saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setPasteSaving(false);
    }
  };

  const handleUpdateType = async (id: string, newType: string) => {
    try {
      const { error } = await supabase.from("course_materials").update({ material_type: newType }).eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["course_materials", courseId] });
      toast({ title: "Material type updated" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const mat = materials.find((m) => m.id === id);
      if (mat?.storage_path) {
        await supabase.storage.from("course-materials").remove([mat.storage_path]);
      }
      const { error } = await supabase.from("course_materials").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["course_materials", courseId] });
      toast({ title: "Material deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="material-type">Material Type</Label>
          <Select value={materialType} onValueChange={setMaterialType}>
            <SelectTrigger id="material-type" className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {materialTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="file-upload" className="sr-only">Upload files</Label>
          <Input
            id="file-upload"
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="w-auto"
          />
        </div>
        <Button variant="outline" onClick={() => setPasteOpen(true)} disabled={uploading}>
          <ClipboardPaste className="h-4 w-4 mr-2" /> Paste Content
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Supported: PDF, DOCX, TXT, XLS/XLSX, QTI (.zip). Max 20MB per file.
      </p>

      <MaterialsList materials={materials} materialTypes={materialTypes} onDelete={handleDelete} onUpdateType={handleUpdateType} isDeleting={deletingId} />

      <PasteContentDialog open={pasteOpen} onOpenChange={setPasteOpen} onSubmit={handlePasteSubmit} isLoading={pasteSaving} />
    </div>
  );
};

export default MaterialsManager;
