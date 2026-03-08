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
  let userId: string | null = null;
  let courseId: string | null = null;
  let moduleId: string | null = null;
  let quizId: string | null = null;
  let supabase: any = null;
  const model = "google/gemini-2.5-pro";

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

    const body = await req.json();
    courseId = body.course_id;
    moduleId = body.module_id;
    quizId = body.quiz_id;
    const { question_count, question_types, difficulty } = body;
    if (!courseId || !quizId || !question_count) throw new Error("Missing required fields: course_id, quiz_id, question_count");

    // Fetch course
    const { data: course, error: courseErr } = await supabase
      .from("courses").select("*").eq("id", courseId).single();
    if (courseErr || !course) throw new Error("Course not found");

    // Fetch module if provided
    let moduleContext = "";
    if (moduleId) {
      const { data: mod } = await supabase.from("modules").select("*").eq("id", moduleId).single();
      if (mod) {
        moduleContext = `\n## MODULE: ${mod.title}\n${mod.description ? `Description: ${mod.description}` : ""}`;
        const objectives = mod.learning_objectives as string[] | null;
        if (objectives && objectives.length > 0) {
          moduleContext += `\nLearning Objectives:\n${objectives.map((o: string) => `- ${o}`).join("\n")}`;
        }
      }
    }

    // Fetch course materials
    const { data: materials } = await supabase
      .from("course_materials")
      .select("file_name, material_type, extracted_text")
      .eq("course_id", courseId)
      .not("extracted_text", "is", null);

    const sourceHierarchy = Array.isArray(course.source_hierarchy)
      ? (course.source_hierarchy as string[]) : [];

    let sortedMaterials = materials || [];
    if (sourceHierarchy.length > 0 && sortedMaterials.length > 0) {
      sortedMaterials = [...sortedMaterials].sort((a: any, b: any) => {
        const aIdx = sourceHierarchy.indexOf(a.material_type);
        const bIdx = sourceHierarchy.indexOf(b.material_type);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    }

    let materialsContext = "";
    for (const mat of sortedMaterials) {
      if (!mat.extracted_text) continue;
      materialsContext += `\n\n--- Source: ${mat.file_name} (${mat.material_type}) ---\n${mat.extracted_text.substring(0, 5000)}`;
    }

    const typesStr = (question_types || ["multiple_choice"]).join(", ");
    const difficultyLevel = difficulty || "intermediate";
    const count = Math.min(30, Math.max(5, question_count));

    const systemPrompt = `You are CourseForge, an expert academic assessment designer. Generate quiz questions grounded strictly in the provided source materials. Never invent facts, cases, or statutes not present in the sources. All questions must be unambiguous with exactly one defensible correct answer.`;

    const userPrompt = `## COURSE CONTEXT
Course: ${course.name}
${course.description ? `Description: ${course.description}` : ""}
${course.institution ? `Institution: ${course.institution}` : ""}
${course.teaching_philosophy ? `Teaching Philosophy: ${course.teaching_philosophy}` : ""}
${sourceHierarchy.length > 0 ? `Source Priority: ${sourceHierarchy.join(", ")}` : ""}

## SOURCE MATERIALS
${materialsContext || "(No source materials uploaded yet — generate questions based on course context above.)"}
${moduleContext}

## TASK
Generate ${count} quiz questions at ${difficultyLevel} level.
Question type distribution: ${typesStr}

For MULTIPLE CHOICE questions:
- Clear, unambiguous question stem
- Exactly 4 options labeled A, B, C, D
- Exactly ONE correct answer
- Distractors must be plausible but clearly wrong on reflection
- Include a 1-2 sentence explanation of why the correct answer is right
- Tag which source material the question is drawn from

For TRUE/FALSE questions:
- Statement must be definitively true or false — no gray areas
- No trick questions or double negatives
- Include explanation

CRITICAL: Return valid JSON only, no markdown, no preamble:
{
  "questions": [
    {
      "question_type": "multiple_choice",
      "question_text": "...",
      "answer_options": [
        {"id": "A", "text": "...", "is_correct": false},
        {"id": "B", "text": "...", "is_correct": true},
        {"id": "C", "text": "...", "is_correct": false},
        {"id": "D", "text": "...", "is_correct": false}
      ],
      "correct_answer": "B",
      "explanation": "...",
      "points": 1,
      "source_reference": "...",
      "difficulty": "${difficultyLevel}"
    }
  ]
}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const latencyMs = Date.now() - startTime;
      const errText = await aiResponse.text();
      if (supabase && userId) {
        await supabase.from("ai_usage_log").insert({
          user_id: userId, course_id: courseId, module_id: moduleId, quiz_id: quizId,
          feature: "quiz_generation", model,
          latency_ms: latencyMs, success: false,
          error_message: `HTTP ${aiResponse.status}: ${errText.substring(0, 500)}`,
        });
      }
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    const latencyMs = Date.now() - startTime;
    const usage = aiData.usage;

    // Log success
    await supabase.from("ai_usage_log").insert({
      user_id: userId, course_id: courseId, module_id: moduleId, quiz_id: quizId,
      feature: "quiz_generation", model,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
      latency_ms: latencyMs, success: true,
    });

    // Parse response
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(content);
    const questions = parsed.questions;
    if (!Array.isArray(questions)) throw new Error("Invalid response format — expected questions array");

    const questionsToInsert = questions.map((q: any, i: number) => ({
      quiz_id: quizId,
      user_id: userId,
      question_text: q.question_text,
      question_type: q.question_type || "multiple_choice",
      options: q.answer_options || [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      sort_order: i,
    }));

    const { data: savedQuestions, error: insertErr } = await supabase
      .from("quiz_questions").insert(questionsToInsert).select("*");
    if (insertErr) throw new Error(`Failed to save questions: ${insertErr.message}`);

    await supabase.from("quizzes").update({ question_count: questions.length }).eq("id", quizId);

    return new Response(JSON.stringify({ questions: savedQuestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const latencyMs = Date.now() - startTime;
    if (supabase && userId) {
      try {
        await supabase.from("ai_usage_log").insert({
          user_id: userId, course_id: courseId, module_id: moduleId, quiz_id: quizId,
          feature: "quiz_generation", model,
          latency_ms: latencyMs, success: false,
          error_message: e instanceof Error ? e.message : "Unknown error",
        });
      } catch { /* don't fail on logging */ }
    }
    console.error("generate-quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
