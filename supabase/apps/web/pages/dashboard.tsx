// apps/web/pages/dashboard.tsx

import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import ManagerTable from '../components/ManagerTable';

export default function Dashboard() {
  const fetcher = (key:string)=>
    supabase.from('clock_entries').select('*, employees(*)').order('created_at', {ascending:false});

  const { data, error } = useSWR('clock_entries', fetcher, { refreshInterval: 30000 });

  if (error) return <p>Error loading…</p>;
  if (!data)   return <p>Loading…</p>;
  return <ManagerTable entries={data.data} />;
}
