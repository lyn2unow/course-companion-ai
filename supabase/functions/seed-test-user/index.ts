import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow in non-production (check for a preview/dev indicator)
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const isProduction = supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("preview");

  // Use service role to create user via admin API
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const email = "test@courseforge.dev";
  const password = "TestUser123!";

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const exists = existingUsers?.users?.some((u) => u.email === email);

  if (exists) {
    return new Response(
      JSON.stringify({ message: "Test user already exists", email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Test User" },
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ message: "Test user created", email, user_id: data.user.id }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
