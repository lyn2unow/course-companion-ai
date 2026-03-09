import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { storagePath, courseId } = await req.json();
    if (!storagePath || !courseId) throw new Error("Missing storagePath or courseId");

    // Download the file from storage using admin client
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("course-materials")
      .download(storagePath);
    if (downloadError || !fileData) throw new Error("Failed to download file");

    const fileName = storagePath.split("/").pop()?.toLowerCase() || "";
    let extractedText = "";

    if (fileName.endsWith(".txt")) {
      extractedText = await fileData.text();
    } else if (fileName.endsWith(".pdf")) {
      // For PDF, extract basic text - the AI can work with raw text extraction
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      extractedText = extractTextFromPdfBytes(bytes);
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      // Extract text from DOCX (XML-based)
      extractedText = await extractTextFromDocx(fileData);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      extractedText = await extractTextFromSpreadsheet(fileData);
    } else if (fileName.endsWith(".zip") || fileName.endsWith(".qti")) {
      extractedText = await extractTextFromQti(fileData);
    } else {
      // Try to read as text
      try {
        extractedText = await fileData.text();
      } catch {
        extractedText = "[Unable to extract text from this file format]";
      }
    }

    // Truncate to avoid huge DB entries (max ~100k chars)
    if (extractedText.length > 100000) {
      extractedText = extractedText.substring(0, 100000) + "\n\n[Content truncated]";
    }

    // Update the course_materials record with extracted text
    const { error: updateError } = await supabaseAdmin
      .from("course_materials")
      .update({ extracted_text: extractedText })
      .eq("storage_path", storagePath)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      throw new Error("Failed to save extracted text");
    }

    return new Response(JSON.stringify({ success: true, length: extractedText.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simple PDF text extraction - pulls text between stream markers
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  // Simple approach: decode the bytes and find readable text content
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);
  
  // Extract text between parentheses (PDF text objects) and BT/ET markers
  const textParts: string[] = [];
  
  // Method 1: Extract text from Tj and TJ operators
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) {
    textParts.push(match[1]);
  }
  
  // Method 2: Extract from TJ arrays
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(raw)) !== null) {
    const inner = match[1];
    const parts = inner.match(/\(([^)]*)\)/g);
    if (parts) {
      textParts.push(parts.map(p => p.slice(1, -1)).join(""));
    }
  }

  if (textParts.length === 0) {
    return "[PDF text extraction returned no content. The PDF may contain scanned images. Please paste the content manually.]";
  }

  // Clean up PDF escape sequences
  return textParts
    .join(" ")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .trim();
}

async function extractTextFromDocx(blob: Blob): Promise<string> {
  try {
    // DOCX is a ZIP containing XML files. We'll look for word/document.xml
    // Simple approach: read as text and extract content between <w:t> tags
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Find the document.xml content within the ZIP
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);
    
    // Extract text from w:t tags
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(raw)) !== null) {
      textParts.push(match[1]);
    }
    
    if (textParts.length === 0) {
      return "[DOCX extraction found no text. Please try pasting content manually.]";
    }
    
    return textParts.join(" ").trim();
  } catch {
    return "[Failed to extract text from DOCX. Please paste content manually.]";
  }
}

async function extractTextFromSpreadsheet(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(new Uint8Array(arrayBuffer));
    
    // For XLSX, extract from shared strings and sheet data
    const textParts: string[] = [];
    
    // Extract shared strings
    const siRegex = /<t[^>]*>([^<]*)<\/t>/g;
    let match;
    while ((match = siRegex.exec(raw)) !== null) {
      if (match[1].trim()) textParts.push(match[1].trim());
    }
    
    if (textParts.length === 0) {
      return "[Spreadsheet extraction found no text. Please paste content manually.]";
    }
    
    return textParts.join("\t").trim();
  } catch {
    return "[Failed to extract spreadsheet data. Please paste content manually.]";
  }
}

async function extractTextFromQti(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(new Uint8Array(arrayBuffer));
    
    // Extract question text and answer content from QTI XML
    const textParts: string[] = [];
    
    // Look for mattext content (QTI 1.2)
    const mattextRegex = /<mattext[^>]*>([^<]*)<\/mattext>/gi;
    let match;
    while ((match = mattextRegex.exec(raw)) !== null) {
      if (match[1].trim()) textParts.push(match[1].trim());
    }
    
    // Look for itemBody content (QTI 2.1)
    const bodyRegex = /<(?:prompt|simpleChoice|p)[^>]*>([^<]*)<\/(?:prompt|simpleChoice|p)>/gi;
    while ((match = bodyRegex.exec(raw)) !== null) {
      if (match[1].trim()) textParts.push(match[1].trim());
    }
    
    if (textParts.length === 0) {
      return "[QTI extraction found no questions. Please verify the file format.]";
    }
    
    return textParts.join("\n").trim();
  } catch {
    return "[Failed to parse QTI content. Please paste content manually.]";
  }
}
