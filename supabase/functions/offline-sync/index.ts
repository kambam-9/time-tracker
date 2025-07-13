import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface OfflineClockEntry {
  employee_id: string;
  terminal_id?: string;
  clock_in: string;
  clock_out?: string;
  notes?: string;
  offline_timestamp: string;
}

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { entries } = await req.json() as { entries: OfflineClockEntry[] };
    
    if (!Array.isArray(entries)) {
      return new Response(
        JSON.stringify({ error: 'Invalid entries format' }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];
    
    for (const entry of entries) {
      try {
        // Validate required fields
        if (!entry.employee_id || !entry.clock_in) {
          results.push({
            entry,
            success: false,
            error: 'Missing required fields: employee_id and clock_in'
          });
          continue;
        }

        // Get employee UUID from employee_id
        const { data: employee, error: empError } = await supabase
          .from('employees')
          .select('id')
          .eq('employee_id', entry.employee_id)
          .single();

        if (empError || !employee) {
          results.push({
            entry,
            success: false,
            error: `Employee not found: ${entry.employee_id}`
          });
          continue;
        }

        // Get terminal UUID if terminal_id is provided
        let terminalUUID = null;
        if (entry.terminal_id) {
          const { data: terminal, error: termError } = await supabase
            .from('terminals')
            .select('id')
            .eq('terminal_id', entry.terminal_id)
            .single();

          if (termError || !terminal) {
            results.push({
              entry,
              success: false,
              error: `Terminal not found: ${entry.terminal_id}`
            });
            continue;
          }
          terminalUUID = terminal.id;
        }

        // Check for duplicate entries (same employee, same clock_in time)
        const { data: existingEntry } = await supabase
          .from('clock_entries')
          .select('id')
          .eq('employee_id', employee.id)
          .eq('clock_in', entry.clock_in)
          .maybeSingle();

        if (existingEntry) {
          results.push({
            entry,
            success: false,
            error: 'Duplicate entry detected'
          });
          continue;
        }

        // Insert the clock entry
        const { data: clockEntry, error: insertError } = await supabase
          .from('clock_entries')
          .insert({
            employee_id: employee.id,
            terminal_id: terminalUUID,
            clock_in: entry.clock_in,
            clock_out: entry.clock_out || null,
            notes: entry.notes || null,
            synced_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          results.push({
            entry,
            success: false,
            error: insertError.message
          });
          continue;
        }

        // Log the sync action
        await supabase
          .from('audit_logs')
          .insert({
            employee_id: employee.id,
            action: 'OFFLINE_SYNC',
            table_name: 'clock_entries',
            record_id: clockEntry.id,
            new_data: {
              ...clockEntry,
              offline_timestamp: entry.offline_timestamp
            }
          });

        results.push({
          entry,
          success: true,
          clock_entry_id: clockEntry.id
        });

      } catch (error) {
        console.error('Error processing entry:', error);
        results.push({
          entry,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        synced: successCount,
        failed: failureCount,
        results 
      }), 
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Offline sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});