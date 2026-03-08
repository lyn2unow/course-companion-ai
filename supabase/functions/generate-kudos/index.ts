import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedPost {
  student_id: string;
  content: string;
  word_count: number;
}

function parseDiscussionContent(raw: string): ParsedPost[] {
  const posts: ParsedPost[] = [];

  // Try CSV format first (Canvas export)
  const lines = raw.split("\n");
  if (lines.length > 1 && lines[0].includes(",")) {
    const header = lines[0].toLowerCase();
    const hasAuthor = header.includes("author") || header.includes("student") || header.includes("name") || header.includes("user");
    const hasMessage = header.includes("message") || header.includes("post") || header.includes("content") || header.includes("body") || header.includes("text");

    if (hasAuthor && hasMessage) {
      // Simple CSV parse
      const cols = lines[0].split(",").map((c) => c.trim().toLowerCase().replace(/"/g, ""));
      const authorIdx = cols.findIndex((c) => /author|student|name|user/.test(c));
      const messageIdx = cols.findIndex((c) => /message|post|content|body|text/.test(c));

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Handle quoted CSV fields
        const fields = parseCSVLine(line);
        const author = fields[authorIdx]?.trim() || `Student ${i}`;
        const content = fields[messageIdx]?.trim() || "";
        if (content) {
          posts.push({
            student_id: author,
            content,
            word_count: content.split(/\s+/).filter(Boolean).length,
          });
        }
      }
      if (posts.length > 0) return posts;
    }
  }

  // Fallback: Try to detect "Name: content" or separated blocks
  const blocks = raw.split(/\n{2,}/);
  let counter = 1;
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const colonMatch = trimmed.match(/^([^:\n]{2,50}):\s*(.+)/s);
    if (colonMatch) {
      const content = colonMatch[2].trim();
      posts.push({
        student_id: colonMatch[1].trim(),
        content,
        word_count: content.split(/\s+/).filter(Boolean).length,
      });
    } else {
      posts.push({
        student_id: `Student ${counter++}`,
        content: trimmed,
        word_count: trimmed.split(/\s+/).filter(Boolean).length,
      });
    }
  }
  return posts;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map((f) => f.replace(/^"|"$/g, ""));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  let supabase: any = null;
  let userId: string | null = null;

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

    const {
      course_id,
      module_id,
      discussion_content,
      min_word_count = 150,
      keywords = [],
      quality_indicators = [],
    } = await req.json();

    if (!course_id || !discussion_content) throw new Error("Missing course_id or discussion_content");

    // Parse discussion posts
    const posts = parseDiscussionContent(discussion_content);
    if (posts.length === 0) throw new Error("No discussion posts found in the provided content");

    // Create analysis record
    const targetModuleId = module_id || null;
    // Use first module if none specified
    let analysisModuleId = targetModuleId;
    if (!analysisModuleId) {
      const { data: firstMod } = await supabase.from("modules").select("id").eq("course_id", course_id).order("sort_order").limit(1).single();
      analysisModuleId = firstMod?.id;
      if (!analysisModuleId) throw new Error("No modules found — create a module first");
    }

    const { data: analysis, error: analysisErr } = await supabase
      .from("discussion_analyses")
      .insert({
        module_id: analysisModuleId,
        user_id: userId,
        criteria: { min_word_count, keywords, quality_indicators },
        status: "processing",
      })
      .select("id")
      .single();
    if (analysisErr) throw analysisErr;

    // Evaluate each post against criteria
    const qualifyingPosts: Array<ParsedPost & { criteria_matched: string[]; criteria_missed: string[] }> = [];
    const nonQualifyingPosts: Array<ParsedPost & { criteria_matched: string[]; criteria_missed: string[] }> = [];

    for (const post of posts) {
      const matched: string[] = [];
      const missed: string[] = [];

      // Word count check
      if (post.word_count >= min_word_count) matched.push(`Word count: ${post.word_count}`);
      else missed.push(`Word count: ${post.word_count}/${min_word_count}`);

      // Keyword check
      const lowerContent = post.content.toLowerCase();
      for (const kw of keywords as string[]) {
        if (lowerContent.includes(kw.toLowerCase())) matched.push(`Keyword: ${kw}`);
        else missed.push(`Keyword: ${kw}`);
      }

      // Quality indicator check
      for (const qi of quality_indicators as string[]) {
        if (lowerContent.includes(qi.toLowerCase())) matched.push(qi);
        else missed.push(qi);
      }

      const meetsCriteria = post.word_count >= min_word_count && missed.length < matched.length;

      if (meetsCriteria) {
        qualifyingPosts.push({ ...post, criteria_matched: matched, criteria_missed: missed });
      } else {
        nonQualifyingPosts.push({ ...post, criteria_matched: matched, criteria_missed: missed });
      }
    }

    // Save all submissions
    const allPosts = [...qualifyingPosts.map((p) => ({ ...p, meets: true })), ...nonQualifyingPosts.map((p) => ({ ...p, meets: false }))];
    const submissionInserts = allPosts.map((p) => ({
      analysis_id: analysis.id,
      user_id: userId,
      student_identifier: p.student_id,
      post_content: p.content,
      word_count: p.word_count,
      meets_criteria: p.meets,
      criteria_matched: p.criteria_matched,
      criteria_missed: p.criteria_missed,
    }));

    const { data: savedSubmissions, error: subErr } = await supabase
      .from("discussion_submissions")
      .insert(submissionInserts)
      .select("*");
    if (subErr) throw subErr;

    // Generate kudos for qualifying posts via AI
    if (qualifyingPosts.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      const { data: course } = await supabase.from("courses").select("name").eq("id", course_id).single();

      const kudosPrompt = `You are an encouraging academic instructor for the course "${course?.name || ""}". 
Generate personalized kudos messages for students who made standout discussion contributions.

For each student below, write a brief (2-3 sentence) personalized kudos message that:
- Specifically references something from their post
- Is warm and encouraging
- Motivates continued engagement

Students and their posts:
${qualifyingPosts.map((p, i) => `\n--- Student: ${p.student_id} (Word count: ${p.word_count}) ---\n${p.content.substring(0, 1000)}`).join("\n")}

Return valid JSON only:
{"kudos": [{"student_id": "...", "message": "..."}]}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a warm, encouraging academic instructor. Generate personalized kudos. Return valid JSON only." },
            { role: "user", content: kudosPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI kudos error:", aiResponse.status, errText);
        // Don't fail the whole request, just skip kudos generation
      } else {
        const aiData = await aiResponse.json();
        let content = aiData.choices?.[0]?.message?.content || "";
        content = content.trim();
        if (content.startsWith("```")) content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

        try {
          const parsed = JSON.parse(content);
          const kudosList = parsed.kudos || [];

          // Match kudos to saved submissions
          const qualifyingSubs = savedSubmissions?.filter((s: any) => s.meets_criteria) || [];
          const kudosInserts = kudosList.map((k: any) => {
            const sub = qualifyingSubs.find((s: any) => s.student_identifier === k.student_id);
            return {
              submission_id: sub?.id || qualifyingSubs[0]?.id,
              analysis_id: analysis.id,
              user_id: userId,
              student_identifier: k.student_id,
              message: k.message,
            };
          }).filter((k: any) => k.submission_id);

          if (kudosInserts.length > 0) {
            await supabase.from("kudos_messages").insert(kudosInserts);
          }
        } catch (e) {
          console.error("Failed to parse kudos JSON:", e);
        }

        // Log AI usage
        const latencyMs = Date.now() - startTime;
        const usage = aiData.usage;
        await supabase.from("ai_usage_log").insert({
          user_id: userId, course_id, module_id: analysisModuleId,
          feature: "kudos_generation", model: "google/gemini-2.5-flash",
          prompt_tokens: usage?.prompt_tokens ?? null,
          completion_tokens: usage?.completion_tokens ?? null,
          total_tokens: usage?.total_tokens ?? null,
          latency_ms: latencyMs, success: true,
        });
      }
    }

    // Update analysis status
    await supabase.from("discussion_analyses").update({
      status: "completed",
      kudos_messages: { total_posts: posts.length, qualifying: qualifyingPosts.length, non_qualifying: nonQualifyingPosts.length },
    }).eq("id", analysis.id);

    // Fetch final results
    const { data: submissions } = await supabase
      .from("discussion_submissions")
      .select("*")
      .eq("analysis_id", analysis.id);
    const { data: kudos } = await supabase
      .from("kudos_messages")
      .select("*")
      .eq("analysis_id", analysis.id);

    return new Response(JSON.stringify({
      analysis_id: analysis.id,
      total_posts: posts.length,
      qualifying_count: qualifyingPosts.length,
      submissions,
      kudos,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-kudos error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
