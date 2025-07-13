import useSWR from 'swr'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import ManagerTable from '../components/ManagerTable'

export default function Dashboard() {
  const fetcher = async (key: string) => {
    const result = await supabase
      .from('clock_entries')
      .select('*, employees(*)')
      .order('created_at', { ascending: false })
    
    if (result.error) throw result.error
    return result.data
  }

  const { data, error, isLoading } = useSWR('clock_entries', fetcher, { 
    refreshInterval: 30000 
  })

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-red-600">Error loading clock entries: {error.message}</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-800 underline mt-4 block">
            ← Back to Login
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Loading clock entries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Manager Dashboard</h1>
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Login
          </Link>
        </div>
        <ManagerTable entries={data || null} />
      </div>
    </div>
  )
}
