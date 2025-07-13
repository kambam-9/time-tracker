import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    console.log("Running alert processor...");
    
    // 1. Detect forgot clock-outs
    const { data: forgotAlerts } = await supabase.rpc('detect_forgot_clockouts');
    
    // 2. Detect overtime
    const { data: overtimeAlerts } = await supabase.rpc('detect_overtime');
    
    const allAlerts = [...(forgotAlerts || []), ...(overtimeAlerts || [])];
    
    for (const alert of allAlerts) {
      // Insert alert
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(alert);
      
      if (insertError) {
        console.error('Error inserting alert:', insertError);
        continue;
      }
      
      // Send notifications
      await sendNotifications(alert);
    }
    
    return new Response(
      JSON.stringify({ processed: allAlerts.length }), 
      { headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error('Alert processor error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function sendNotifications(alert: any) {
  try {
    // Get employee details
    const { data: employee } = await supabase
      .from('employees')
      .select('first_name, last_name')
      .eq('id', alert.employee_id)
      .single();
    
    if (!employee) return;
    
    const message = alert.type === 'forgot_out' 
      ? `${employee.first_name} ${employee.last_name} forgot to clock out`
      : `${employee.first_name} ${employee.last_name} worked overtime (${alert.details.hours_worked} hours)`;
    
    // Send SMS (implement with your Twilio credentials)
    await sendSMS(message);
    
    // Send Email (implement with your EmailJS credentials)
    await sendEmail(message);
    
  } catch (error) {
    console.error('Notification error:', error);
  }
}

async function sendSMS(message: string) {
  // TODO: Implement Twilio SMS
  console.log('SMS:', message);
}

async function sendEmail(message: string) {
  // TODO: Implement EmailJS
  console.log('Email:', message);
}