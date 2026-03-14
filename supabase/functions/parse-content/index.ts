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

    console.log(`[parse-content] Processing: ${storagePath}`);

    // Download the file from storage using admin client
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("course-materials")
      .download(storagePath);
    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download file: " + (downloadError?.message || "unknown"));
    }

    console.log(`[parse-content] Downloaded file, size: ${fileData.size} bytes`);

    const fileName = storagePath.split("/").pop()?.toLowerCase() || "";
    let extractedText = "";

    if (fileName.endsWith(".txt")) {
      extractedText = await fileData.text();
      console.log(`[parse-content] TXT extracted, length: ${extractedText.length}`);
    } else if (fileName.endsWith(".pdf")) {
      try {
        extractedText = await extractTextFromPdf(fileData);
        console.log(`[parse-content] PDF extracted, length: ${extractedText.length}`);
      } catch (pdfErr: any) {
        console.error("[parse-content] PDF extraction error:", pdfErr);
        extractedText = `[PDF extraction failed: ${pdfErr?.message ?? String(pdfErr)}]`;
      }
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      extractedText = await extractTextFromDocx(fileData);
      console.log(`[parse-content] DOCX extracted, length: ${extractedText.length}`);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      extractedText = await extractTextFromSpreadsheet(fileData);
    } else if (fileName.endsWith(".zip") || fileName.endsWith(".qti")) {
      extractedText = await extractTextFromQti(fileData);
    } else {
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

    console.log(`[parse-content] Successfully saved extracted text, length: ${extractedText.length}`);

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

// ─── PDF Text Extraction ───────────────────────────────────────
// Uses multiple strategies to extract text from PDF files
async function extractTextFromPdf(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);

  const textParts: string[] = [];

  // Strategy 1: Extract text from Tj operator (single string)
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) {
    const cleaned = decodePdfString(match[1]);
    if (cleaned.trim()) textParts.push(cleaned);
  }

  // Strategy 2: Extract from TJ arrays (multiple strings with kerning)
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/gi;
  while ((match = tjArrayRegex.exec(raw)) !== null) {
    const inner = match[1];
    const parts = inner.match(/\(([^)]*)\)/g);
    if (parts) {
      const combined = parts.map(p => decodePdfString(p.slice(1, -1))).join("");
      if (combined.trim()) textParts.push(combined);
    }
  }

  // Strategy 3: Look for text in stream blocks using different encodings
  if (textParts.length < 5) {
    // Try to find FlateDecode streams and decompress them
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    while ((match = streamRegex.exec(raw)) !== null) {
      try {
        const streamBytes = new Uint8Array(
          match[1].split("").map(c => c.charCodeAt(0))
        );
        // Try to decompress — wrap in promise to catch async stream errors
        const decompressedText = await new Promise<string>((resolve, reject) => {
          try {
            const ds = new DecompressionStream("deflate");
            const writer = ds.writable.getWriter();
            writer.write(streamBytes).catch(() => {});
            writer.close().catch(() => {});
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            const pump = (): Promise<void> => reader.read().then(({ done, value }) => {
              if (done) {
                const total = chunks.reduce((a, c) => a + c.length, 0);
                const result = new Uint8Array(total);
                let offset = 0;
                for (const chunk of chunks) {
                  result.set(chunk, offset);
                  offset += chunk.length;
                }
                resolve(new TextDecoder("latin1").decode(result));
                return;
              }
              if (value) chunks.push(value);
              return pump();
            }).catch(reject);
            pump().catch(reject);
          } catch (e) {
            reject(e);
          }
        });

        // Extract text operators from decompressed stream
        const innerTj = /\(([^)]*)\)\s*Tj/g;
        let innerMatch;
        while ((innerMatch = innerTj.exec(decompressedText)) !== null) {
          const cleaned = decodePdfString(innerMatch[1]);
          if (cleaned.trim()) textParts.push(cleaned);
        }
        const innerTJArray = /\[([^\]]*)\]\s*TJ/gi;
        while ((innerMatch = innerTJArray.exec(decompressedText)) !== null) {
          const inner2 = innerMatch[1];
          const parts2 = inner2.match(/\(([^)]*)\)/g);
          if (parts2) {
            const combined = parts2.map(p => decodePdfString(p.slice(1, -1))).join("");
            if (combined.trim()) textParts.push(combined);
          }
        }
      } catch {
        // Decompression failed for this stream, skip it
      }
    }
  }

  if (textParts.length === 0) {
    return "[SCANNED PDF - Please use Paste Content to add text manually]";
  }

  // Join with spaces and clean up
  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/(\.\s)/g, ".\n")
    .trim();
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

// ─── DOCX Text Extraction ─────────────────────────────────────
// DOCX files are ZIP archives containing XML. We decompress and parse.
async function extractTextFromDocx(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // DOCX is a ZIP file. Find and extract document.xml
    const xmlContent = await extractFileFromZip(bytes, "word/document.xml");

    if (!xmlContent) {
      // Fallback: try raw decode
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(bytes);
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
    }

    // Parse w:t tags from the XML, preserving paragraph breaks
    const textParts: string[] = [];
    // Split by paragraph markers
    const paragraphs = xmlContent.split(/<\/w:p>/gi);
    for (const para of paragraphs) {
      const paraTexts: string[] = [];
      const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let match;
      while ((match = regex.exec(para)) !== null) {
        paraTexts.push(match[1]);
      }
      if (paraTexts.length > 0) {
        textParts.push(paraTexts.join(""));
      }
    }

    if (textParts.length === 0) {
      return "[DOCX extraction found no text. Please try pasting content manually.]";
    }

    return textParts.join("\n").trim();
  } catch (e) {
    console.error("DOCX extraction error:", e);
    return "[Failed to extract text from DOCX. Please paste content manually.]";
  }
}

// ─── ZIP File Extraction Helper ────────────────────────────────
// Minimal ZIP extraction to find a specific file within a ZIP archive
async function extractFileFromZip(zipBytes: Uint8Array, targetPath: string): Promise<string | null> {
  try {
    // Find local file headers (PK\x03\x04)
    const targetLower = targetPath.toLowerCase();

    for (let i = 0; i < zipBytes.length - 30; i++) {
      // Look for local file header signature
      if (zipBytes[i] !== 0x50 || zipBytes[i + 1] !== 0x4B ||
          zipBytes[i + 2] !== 0x03 || zipBytes[i + 3] !== 0x04) continue;

      const compressionMethod = zipBytes[i + 8] | (zipBytes[i + 9] << 8);
      const compressedSize = zipBytes[i + 18] | (zipBytes[i + 19] << 8) |
        (zipBytes[i + 20] << 16) | (zipBytes[i + 21] << 24);
      const uncompressedSize = zipBytes[i + 22] | (zipBytes[i + 23] << 8) |
        (zipBytes[i + 24] << 16) | (zipBytes[i + 25] << 24);
      const fileNameLength = zipBytes[i + 26] | (zipBytes[i + 27] << 8);
      const extraLength = zipBytes[i + 28] | (zipBytes[i + 29] << 8);

      const fileNameBytes = zipBytes.slice(i + 30, i + 30 + fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes).toLowerCase();

      if (fileName !== targetLower) continue;

      const dataStart = i + 30 + fileNameLength + extraLength;
      const compressedData = zipBytes.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        // Stored (no compression)
        return new TextDecoder("utf-8").decode(compressedData);
      } else if (compressionMethod === 8) {
        // Deflate
        try {
          const ds = new DecompressionStream("raw");
          const writer = ds.writable.getWriter();
          writer.write(compressedData);
          writer.close();
          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          const total = chunks.reduce((a, c) => a + c.length, 0);
          const result = new Uint8Array(total);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          return new TextDecoder("utf-8").decode(result);
        } catch (e) {
          console.error("Deflate decompression failed:", e);
          return null;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("ZIP extraction error:", e);
    return null;
  }
}

// ─── Spreadsheet Extraction ───────────────────────────────────
async function extractTextFromSpreadsheet(blob: Blob): Promise<string> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Try to extract shared strings from XLSX (ZIP-based)
    const sharedStrings = await extractFileFromZip(bytes, "xl/sharedstrings.xml");
    if (sharedStrings) {
      const textParts: string[] = [];
      const regex = /<t[^>]*>([^<]*)<\/t>/g;
      let match;
      while ((match = regex.exec(sharedStrings)) !== null) {
        if (match[1].trim()) textParts.push(match[1].trim());
      }
      if (textParts.length > 0) return textParts.join("\t").trim();
    }

    // Fallback: raw decode
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);
    const textParts: string[] = [];
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

// ─── QTI Extraction ───────────────────────────────────────────
async function extractTextFromQti(blob: Blob): Promise<string> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Try extracting XML files from the ZIP
    const candidates = ["imsmanifest.xml"];
    let allText = "";

    // Scan all files in the ZIP for QTI content
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(bytes);

    const textParts: string[] = [];
    // QTI 1.2 mattext
    const mattextRegex = /<mattext[^>]*>([\s\S]*?)<\/mattext>/gi;
    let match;
    while ((match = mattextRegex.exec(raw)) !== null) {
      const cleaned = match[1].replace(/<[^>]*>/g, "").trim();
      if (cleaned) textParts.push(cleaned);
    }
    // QTI 2.1
    const bodyRegex = /<(?:prompt|simpleChoice|p)[^>]*>([\s\S]*?)<\/(?:prompt|simpleChoice|p)>/gi;
    while ((match = bodyRegex.exec(raw)) !== null) {
      const cleaned = match[1].replace(/<[^>]*>/g, "").trim();
      if (cleaned) textParts.push(cleaned);
    }

    if (textParts.length === 0) {
      return "[QTI extraction found no questions. Please verify the file format.]";
    }
    return textParts.join("\n").trim();
  } catch {
    return "[Failed to parse QTI content. Please paste content manually.]";
  }
}
