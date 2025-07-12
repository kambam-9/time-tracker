import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const body = await req.json();      // { entries: [...] }
  const results: any[] = [];

  for (const e of body.entries) {
    // 1. server timestamp
    const now = new Date();
    // 2. flag if off by >2 min
    const diff = Math.abs(now.getTime() - new Date(e.clock_in).getTime()) / 60000;
    const flagged = diff > 2;
    const { data, error } = await supabase.from('clock_entries').insert({
      ...e,
      flagged,
      source: 'offline'
    });
    results.push({ data, error });
  }
  return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json"}});
});
