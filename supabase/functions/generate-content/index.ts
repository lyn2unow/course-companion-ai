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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { moduleId, contentType, courseId } = await req.json();
    if (!moduleId || !contentType || !courseId) throw new Error("Missing required fields");

    // Fetch course and module data
    const [courseRes, moduleRes] = await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).single(),
      supabase.from("modules").select("*").eq("id", moduleId).single(),
    ]);

    if (courseRes.error) throw new Error("Course not found");
    if (moduleRes.error) throw new Error("Module not found");

    const course = courseRes.data;
    const module = moduleRes.data;

    // Fetch course materials with extracted text
    const { data: materials } = await supabase
      .from("course_materials")
      .select("file_name, material_type, extracted_text")
      .eq("course_id", courseId)
      .not("extracted_text", "is", null);

    // Build source materials context (limit to ~30k chars total)
    let materialsContext = "";
    if (materials && materials.length > 0) {
      let totalChars = 0;
      const maxChars = 30000;
      for (const mat of materials) {
        if (!mat.extracted_text || totalChars >= maxChars) break;
        const chunk = mat.extracted_text.substring(0, maxChars - totalChars);
        materialsContext += `\n\n--- Source: ${mat.file_name} (${mat.material_type}) ---\n${chunk}`;
        totalChars += chunk.length;
      }
    }

    // Build context-aware prompt
    const sourceHierarchy = Array.isArray(course.source_hierarchy)
      ? (course.source_hierarchy as string[]).join(", ")
      : "";

    const courseContext = `
Course: ${course.name}
${course.description ? `Description: ${course.description}` : ""}
${course.institution ? `Institution: ${course.institution}` : ""}
${course.teaching_philosophy ? `Teaching Philosophy: ${course.teaching_philosophy}` : ""}
${sourceHierarchy ? `Source Material Priority: ${sourceHierarchy}` : ""}

Module: ${module.title}
${module.description ? `Module Description: ${module.description}` : ""}
${materialsContext ? `\n\n=== SOURCE MATERIALS ===\nUse the following source materials to generate accurate, relevant content:${materialsContext}` : ""}
`.trim();

    const contentPrompts: Record<string, string> = {
      lecture_notes: `Generate comprehensive, well-structured lecture notes for the following module. Include clear headings, key concepts, examples, and summary points. Format using markdown.

${courseContext}`,
      key_terms: `Extract and define 15-20 key terms and concepts for the following module. For each term, provide a clear, concise definition suitable for student study. Format as a markdown list with **bold** terms followed by their definitions.

${courseContext}`,
      discussion_prompt: `Create 3-5 thought-provoking discussion prompts for the following module. Each prompt should encourage critical thinking, application of concepts, and peer engagement. Include guidance on expected response length and evaluation criteria. Format using markdown.

${courseContext}`,
    };

    const prompt = contentPrompts[contentType];
    if (!prompt) throw new Error(`Invalid content type: ${contentType}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are an expert educational content creator. Generate high-quality academic content that is accurate, well-organized, and pedagogically sound. Always use markdown formatting.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
