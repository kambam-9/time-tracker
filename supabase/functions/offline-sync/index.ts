import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const body = await req.json();
    const { entries } = body;
    
    if (!entries || !Array.isArray(entries)) {
      return new Response(
        JSON.stringify({ error: "Invalid entries format" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const results = [];
    
    for (const entry of entries) {
      const serverTime = new Date();
      const entryTime = new Date(entry.clock_in || entry.clock_out);
      const timeDiffMinutes = Math.abs(serverTime.getTime() - entryTime.getTime()) / 60000;
      
      // Flag if time difference > 2 minutes
      const flagged = timeDiffMinutes > 2;
      
      const { data, error } = await supabase
        .from('clock_entries')
        .insert({
          ...entry,
          flagged,
          source: 'offline',
          notes: flagged ? `Time discrepancy: ${timeDiffMinutes.toFixed(1)} minutes` : null
        });
      
      results.push({ 
        success: !error, 
        error: error?.message,
        flagged 
      });
    }
    
    return new Response(
      JSON.stringify({ results }), 
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});