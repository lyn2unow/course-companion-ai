import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeCsv(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

interface AnswerOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: AnswerOption[] | any;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
}

// ─── CSV ───────────────────────────────────────────────────────
function generateCsv(questions: QuizQuestion[]): string {
  const headers = [
    "Question_Type", "Question_Text", "Option_A", "Option_B",
    "Option_C", "Option_D", "Correct_Answer", "Explanation", "Points",
  ];
  const rows = [headers.map(escapeCsv).join(",")];

  for (const q of questions) {
    const opts = Array.isArray(q.options) ? q.options : [];
    const optA = opts.find((o: any) => o.id === "A")?.text ?? opts[0]?.text ?? "";
    const optB = opts.find((o: any) => o.id === "B")?.text ?? opts[1]?.text ?? "";
    const optC = opts.find((o: any) => o.id === "C")?.text ?? opts[2]?.text ?? "";
    const optD = opts.find((o: any) => o.id === "D")?.text ?? opts[3]?.text ?? "";

    rows.push(
      [
        escapeCsv(q.question_type),
        escapeCsv(q.question_text),
        escapeCsv(optA),
        escapeCsv(optB),
        escapeCsv(q.question_type === "true_false" ? "" : optC),
        escapeCsv(q.question_type === "true_false" ? "" : optD),
        escapeCsv(q.correct_answer),
        escapeCsv(q.explanation || ""),
        "1",
      ].join(",")
    );
  }
  return rows.join("\n");
}

// ─── QTI 1.2 ──────────────────────────────────────────────────
function generateQti(questions: QuizQuestion[], title: string): string {
  const items = questions.map((q, idx) => {
    const opts = Array.isArray(q.options) ? q.options : [];
    const labels = opts
      .map(
        (o: any) =>
          `        <response_label ident="${escapeXml(o.id || String(idx))}">
          <material><mattext texttype="text/plain">${escapeXml(o.text || String(o))}</mattext></material>
        </response_label>`
      )
      .join("\n");

    const correctId = q.correct_answer;

    return `  <item ident="${q.id}" title="Question ${idx + 1}">
    <presentation>
      <material><mattext texttype="text/plain">${escapeXml(q.question_text)}</mattext></material>
      <response_lid ident="response1" rcardinality="Single">
        <render_choice>
${labels}
        </render_choice>
      </response_lid>
    </presentation>
    <resprocessing>
      <outcomes>
        <decvar maxvalue="1" minvalue="0" varname="SCORE" vartype="Decimal"/>
      </outcomes>
      <respcondition continue="No">
        <conditionvar>
          <varequal respident="response1">${escapeXml(correctId)}</varequal>
        </conditionvar>
        <setvar action="Set" varname="SCORE">1</setvar>
      </respcondition>
    </resprocessing>
    <itemfeedback ident="general_fb">
      <flow_mat>
        <material><mattext texttype="text/plain">${escapeXml(q.explanation || "")}</mattext></material>
      </flow_mat>
    </itemfeedback>
  </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
<assessment ident="${escapeXml(title)}" title="${escapeXml(title)}">
  <section ident="main">
${items.join("\n")}
  </section>
</assessment>
</questestinterop>`;
}

// ─── GIFT (Moodle) ────────────────────────────────────────────
function generateGift(questions: QuizQuestion[]): string {
  return questions
    .map((q) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (q.question_type === "true_false") {
        const correct = opts.find((o: any) => o.is_correct);
        const answer = correct?.text?.toLowerCase() === "true" ? "TRUE" : "FALSE";
        return `// ${q.question_text}\n${q.question_text}{${answer}}`;
      }
      // multiple choice
      const choices = opts
        .map((o: any) => (o.is_correct ? `=${o.text}` : `~${o.text}`))
        .join("\n  ");
      return `// ${q.question_text}\n${q.question_text}{\n  ${choices}\n}`;
    })
    .join("\n\n");
}

// ─── ZIP helper (minimal, no external deps) ───────────────────
function createZip(files: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const centralDirectory: Uint8Array[] = [];
  const localFiles: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header (30 + name + data)
    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression (none)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);
    localFiles.push(local);

    // Central directory entry (46 + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralDirectory.push(central);

    offset += local.length;
  }

  const cdSize = centralDirectory.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const total = offset + cdSize + 22;
  const result = new Uint8Array(total);
  let pos = 0;
  for (const lf of localFiles) { result.set(lf, pos); pos += lf.length; }
  for (const cd of centralDirectory) { result.set(cd, pos); pos += cd.length; }
  result.set(eocd, pos);
  return result;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ─── Main handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { quiz_id, format } = await req.json();
    if (!quiz_id || !format) throw new Error("Missing required fields: quiz_id, format");

    const validFormats = ["csv", "qti_canvas", "qti_blackboard", "gift_moodle", "qti_brightspace"];
    if (!validFormats.includes(format)) throw new Error(`Invalid format. Must be one of: ${validFormats.join(", ")}`);

    // Fetch quiz
    const { data: quiz, error: quizErr } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quiz_id)
      .single();
    if (quizErr || !quiz) throw new Error("Quiz not found");

    // Fetch questions
    const { data: questions, error: qErr } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quiz_id)
      .order("sort_order");
    if (qErr) throw new Error("Failed to fetch questions");
    if (!questions || questions.length === 0) throw new Error("Quiz has no questions");

    const sanitizedTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
    const dateStr = new Date().toISOString().split("T")[0];
    const encoder = new TextEncoder();

    let fileData: Uint8Array;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case "csv": {
        const csv = generateCsv(questions);
        fileData = encoder.encode(csv);
        filename = `${sanitizedTitle}-csv-${dateStr}.csv`;
        mimeType = "text/csv";
        break;
      }

      case "qti_canvas":
      case "qti_blackboard":
      case "qti_brightspace": {
        const qtiXml = generateQti(questions, quiz.title);
        const xmlBytes = encoder.encode(qtiXml);

        // Wrap in ZIP as LMS platforms require it
        const xmlFilename = `${sanitizedTitle}.xml`;
        fileData = createZip([{ name: xmlFilename, data: xmlBytes }]);
        const platformName = format.replace("qti_", "");
        filename = `${sanitizedTitle}-qti-${platformName}-${dateStr}.zip`;
        mimeType = "application/zip";
        break;
      }

      case "gift_moodle": {
        const gift = generateGift(questions);
        fileData = encoder.encode(gift);
        filename = `${sanitizedTitle}-gift-moodle-${dateStr}.txt`;
        mimeType = "text/plain";
        break;
      }

      default:
        throw new Error("Unsupported format");
    }

    // Base64-encode for JSON transport
    const base64 = btoa(String.fromCharCode(...fileData));

    return new Response(
      JSON.stringify({ file: base64, filename, mimeType }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("export-quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
