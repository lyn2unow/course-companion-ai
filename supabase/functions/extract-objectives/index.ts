import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let supabase: any = null;
  let userId: string | null = null;
  let courseId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");
    userId = user.id;

    const { courseId: cId, courseName } = await req.json();
    courseId = cId;
    if (!courseId) throw new Error("Missing courseId");

    // Retry up to 3 times waiting for extracted_text to become available
    let syllabusData = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
      const { data } = await supabase
        .from("course_materials")
        .select("extracted_text, file_name")
        .eq("course_id", courseId)
        .eq("material_type", "syllabus")
        .not("extracted_text", "is", null)
        .limit(1)
        .maybeSingle();
      if (data?.extracted_text) { syllabusData = data; break; }
    }

    if (!syllabusData) {
      return new Response(JSON.stringify({ objectives: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedText = syllabusData.extracted_text as string;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert educator. Extract or infer learning objectives from course syllabi. Return valid JSON only.",
          },
          {
            role: "user",
            content: `Extract the learning objectives from this syllabus for the course '${courseName || ""}'. Return ONLY a JSON array of strings — one string per objective. If no explicit objectives exist, infer 3-5 from the course description and topics covered. No markdown, no preamble, just the JSON array.\n\nSyllabus (first 8000 characters):\n${extractedText.slice(0, 8000)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please wait a moment and try again.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits exhausted. Please add funds to continue using AI features.");
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let objectives: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        objectives = parsed.filter((item: any) => typeof item === "string");
      }
    } catch (e) {
      console.error("Failed to parse objectives JSON:", e);
    }

    // Log success
    const latencyMs = Date.now() - startTime;
    const usage = aiData.usage;
    await supabase.from("ai_usage_log").insert({
      user_id: userId,
      course_id: courseId,
      module_id: null,
      quiz_id: null,
      feature: "extract_objectives",
      content_type: "learning_objectives",
      model: "google/gemini-2.5-flash",
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      latency_ms: latencyMs,
      success: true,
    });

    return new Response(JSON.stringify({ objectives }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-objectives error:", e);

    // Log failure
    if (supabase && userId) {
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        course_id: courseId,
        module_id: null,
        quiz_id: null,
        feature: "extract_objectives",
        content_type: "learning_objectives",
        model: "google/gemini-2.5-flash",
        latency_ms: Date.now() - startTime,
        success: false,
        error_message: e instanceof Error ? e.message : "Unknown error",
      });
    }

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
