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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { courseId, moduleId, title, questionCount, questionTypes, difficulty } = await req.json();
    if (!courseId || !title || !questionCount) throw new Error("Missing required fields");

    // Fetch course data
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();
    if (courseErr) throw new Error("Course not found");

    // Optionally fetch module data
    let moduleContext = "";
    if (moduleId) {
      const { data: mod } = await supabase.from("modules").select("*").eq("id", moduleId).single();
      if (mod) {
        moduleContext = `\nModule: ${mod.title}\n${mod.description ? `Module Description: ${mod.description}` : ""}`;
      }
    }

    // Fetch course materials
    const { data: materials } = await supabase
      .from("course_materials")
      .select("file_name, material_type, extracted_text")
      .eq("course_id", courseId)
      .not("extracted_text", "is", null);

    let materialsContext = "";
    if (materials && materials.length > 0) {
      let totalChars = 0;
      const maxChars = 25000;
      for (const mat of materials) {
        if (!mat.extracted_text || totalChars >= maxChars) break;
        const chunk = mat.extracted_text.substring(0, maxChars - totalChars);
        materialsContext += `\n\n--- Source: ${mat.file_name} (${mat.material_type}) ---\n${chunk}`;
        totalChars += chunk.length;
      }
    }

    const typesStr = (questionTypes || ["multiple_choice"]).join(", ");
    const difficultyStr = difficulty || "intermediate";

    const prompt = `Generate exactly ${questionCount} quiz questions for the following course content.

Course: ${course.name}
${course.description ? `Description: ${course.description}` : ""}
${course.teaching_philosophy ? `Teaching Philosophy: ${course.teaching_philosophy}` : ""}
${moduleContext}
${materialsContext ? `\n=== SOURCE MATERIALS ===\n${materialsContext}` : ""}

Requirements:
- Question types allowed: ${typesStr}
- Difficulty level: ${difficultyStr}
- Each question must have a clear correct answer and explanation

Return ONLY a valid JSON array (no markdown, no code fences) where each element has:
{
  "question_text": "The question",
  "question_type": "multiple_choice" or "true_false",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "A) ...",
  "explanation": "Why this is correct"
}

For true/false questions, options should be ["True", "False"] and correct_answer should be "True" or "False".`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: "You are an expert quiz creator for academic courses. Generate high-quality, pedagogically sound quiz questions. Return ONLY valid JSON arrays with no markdown formatting or code fences.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    // Strip markdown code fences if present
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const questions = JSON.parse(content);
    if (!Array.isArray(questions)) throw new Error("Invalid response format");

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
