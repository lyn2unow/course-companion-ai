import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Copy, FileText, Table, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExportMenuProps {
  content: string;
  contentType: string;
  moduleTitle?: string;
}

const ExportMenu = ({ content, contentType, moduleTitle }: ExportMenuProps) => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard" });
  };

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-content", {
        body: { content, contentType, format, title: moduleTitle || "export" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // data.file is base64 encoded, data.filename has the name, data.mimeType
      const byteString = atob(data.file);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: data.mimeType });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported as ${format.toUpperCase()}` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={exporting} aria-label="Export content">
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" /> Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <Table className="h-4 w-4 mr-2" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("docx")}>
          <FileText className="h-4 w-4 mr-2" /> Export as DOCX
        </DropdownMenuItem>
        {contentType === "key_terms" || contentType === "discussion_prompt" ? null : (
          <DropdownMenuItem onClick={() => handleExport("qti")}>
            <FileDown className="h-4 w-4 mr-2" /> Export as QTI (Canvas)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportMenu;
