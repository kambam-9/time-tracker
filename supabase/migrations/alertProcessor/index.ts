import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  // 1. find shifts still open >30 min past schedule end
  const { data: forgotten } = await supabase.rpc('detect_forgot_clockouts');
  // 2. find overtime >4 h
  const { data: overtime }  = await supabase.rpc('detect_overtime');
  const alerts = [...forgotten, ...overtime];

  for (const a of alerts) {
    // Insert alert row (idempotent via unique key on (employee_id,type,shift_date))
    await supabase.from('alerts').insert(a).onConflict('id').ignore();
    // Send notifications
    await sendSms(a);
    await sendEmail(a);
  }

  return new Response("processed");
});

async function sendSms(a: any) {
  // Twilio REST call
}

async function sendEmail(a: any) {
  // EmailJS REST call
}
