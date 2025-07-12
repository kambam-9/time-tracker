import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { haversine } from '../lib/geo';
import { hashSync } from 'bcryptjs';

const ALLOWED_LAT = 37.422;   // example
const ALLOWED_LON = -122.084;
const RADIUS_M = 150;         // 150 m

export default function ClockPage() {
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClock(direction: 'in' | 'out') {
    setMsg('Checking location …');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const dist = haversine(
        ALLOWED_LAT, ALLOWED_LON,
        coords.latitude, coords.longitude
      );
      if (dist > RADIUS_M) {
        setMsg('You are outside the permitted area.');
        return;
      }

      // Backend verifies IP via RLS on insert
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('pin_hash', hashSync(pin, 8))   // quick example; real hash comparison done server-side
        .single();

      if (!emp) { setMsg('Invalid PIN'); return; }

      const payload = direction === 'in'
        ? { employee_id: emp.id, clock_in: new Date(), in_lat: coords.latitude, in_lon: coords.longitude, source: 'mobile' }
        : { employee_id: emp.id, clock_out: new Date(), out_lat: coords.latitude, out_lon: coords.longitude, source: 'mobile' };

      const { error } = await supabase.from('clock_entries').insert(payload);
      setMsg(error ? error.message : `Clock-${direction} successful!`);
    }, err => setMsg(err.message));
  }

  return (
    <main className="flex flex-col items-center gap-4 mt-10">
      <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
             className="border p-2 text-center tracking-widest" maxLength={6}
             placeholder="Enter PIN" />
      <div className="flex gap-4">
        <button onClick={()=>handleClock('in')}  className="btn-green">Clock In</button>
        <button onClick={()=>handleClock('out')} className="btn-red">Clock Out</button>
      </div>
      {msg && <p className="mt-4 text-sm text-center">{msg}</p>}
    </main>
  );
}
