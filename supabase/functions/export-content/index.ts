import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { content, contentType, format, title } = await req.json();
    if (!content || !format) throw new Error("Missing content or format");

    const safeTitle = (title || "export").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    let file: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case "csv":
        file = generateCsv(content, contentType);
        filename = `${safeTitle}.csv`;
        mimeType = "text/csv";
        break;
      case "qti":
        file = generateQti(content, safeTitle);
        filename = `${safeTitle}_qti.xml`;
        mimeType = "application/xml";
        break;
      case "docx":
        file = generateDocxXml(content, safeTitle);
        filename = `${safeTitle}.docx.xml`;
        mimeType = "application/xml";
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Encode as base64 for transport
    const encoder = new TextEncoder();
    const bytes = encoder.encode(file);
    const base64 = btoa(String.fromCharCode(...bytes));

    return new Response(JSON.stringify({ file: base64, filename, mimeType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("export-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCsv(content: string, contentType: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  const rows: string[][] = [];

  if (contentType === "key_terms") {
    rows.push(["Term", "Definition"]);
    for (const line of lines) {
      // Match **term** - definition or **term**: definition
      const match = line.match(/\*\*([^*]+)\*\*[:\s-]+(.+)/);
      if (match) {
        rows.push([match[1].trim(), match[2].trim()]);
      }
    }
  } else {
    rows.push(["Content"]);
    for (const line of lines) {
      rows.push([line.replace(/^#+\s*/, "").replace(/\*\*/g, "")]);
    }
  }

  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}

function generateQti(content: string, title: string): string {
  // IMS QTI 1.2 format compatible with Canvas and Blackboard
  const lines = content.split("\n").filter((l) => l.trim());
  let items = "";
  let itemCount = 0;

  for (const line of lines) {
    const cleanLine = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/^\d+\.\s*/, "").trim();
    if (!cleanLine || cleanLine.length < 10) continue;
    itemCount++;
    items += `
    <item ident="item_${itemCount}" title="Question ${itemCount}">
      <presentation>
        <material>
          <mattext texttype="text/plain">${escapeXml(cleanLine)}</mattext>
        </material>
      </presentation>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2">
  <assessment ident="${title}" title="${escapeXml(title)}">
    <section ident="section_1" title="Section 1">${items}
    </section>
  </assessment>
</questestinterop>`;
}

function generateDocxXml(content: string, title: string): string {
  const lines = content.split("\n");
  let paragraphs = "";

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) {
      paragraphs += `<w:p><w:r><w:t></w:t></w:r></w:p>`;
      continue;
    }
    const headingMatch = clean.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      paragraphs += `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(headingMatch[2])}</w:t></w:r></w:p>`;
    } else {
      // Handle bold markers
      const text = clean.replace(/\*\*([^*]+)\*\*/g, "$1");
      paragraphs += `<w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>
    ${paragraphs}
  </w:body>
</w:document>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
