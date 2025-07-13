import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { haversine } from '../lib/geo'
import { hashSync } from 'bcryptjs'

const ALLOWED_LAT = 37.422   // example coordinates
const ALLOWED_LON = -122.084
const RADIUS_M = 150         // 150 meter radius

export default function Home() {
  const [pin, setPin] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClock(direction: 'in' | 'out') {
    if (!pin || pin.length < 4) {
      setMsg('Please enter a valid PIN')
      return
    }

    setLoading(true)
    setMsg('Checking location...')

    if (!navigator.geolocation) {
      setMsg('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const dist = haversine(
            ALLOWED_LAT,
            ALLOWED_LON,
            coords.latitude,
            coords.longitude
          )

          if (dist > RADIUS_M) {
            setMsg('You are outside the permitted area.')
            setLoading(false)
            return
          }

          // Note: In production, PIN verification should be done server-side
          // This is just dummy logic for UI demonstration
          const { data: emp } = await supabase
            .from('employees')
            .select('*')
            .eq('pin_hash', hashSync(pin, 8))
            .single()

          if (!emp) {
            setMsg('Invalid PIN')
            setLoading(false)
            return
          }

          const payload = direction === 'in'
            ? {
                employee_id: emp.id,
                clock_in: new Date().toISOString(),
                in_lat: coords.latitude,
                in_lon: coords.longitude,
                source: 'web'
              }
            : {
                employee_id: emp.id,
                clock_out: new Date().toISOString(),
                out_lat: coords.latitude,
                out_lon: coords.longitude,
                source: 'web'
              }

          const { error } = await supabase.from('clock_entries').insert(payload)
          
          if (error) {
            setMsg(`Error: ${error.message}`)
          } else {
            setMsg(`Clock-${direction} successful!`)
            setPin('')
          }
        } catch (error) {
          setMsg('An error occurred while processing your request')
        }
        setLoading(false)
      },
      (err) => {
        setMsg(`Location error: ${err.message}`)
        setLoading(false)
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Time Tracker
        </h1>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Your PIN
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input-field w-full text-center tracking-widest text-lg"
              maxLength={6}
              placeholder="••••••"
              disabled={loading}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => handleClock('in')}
              disabled={loading || !pin}
              className="btn-green flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Clock In'}
            </button>
            <button
              onClick={() => handleClock('out')}
              disabled={loading || !pin}
              className="btn-red flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Clock Out'}
            </button>
          </div>

          {msg && (
            <div className={`mt-4 p-3 rounded text-sm text-center ${
              msg.includes('successful') 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {msg}
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Manager Login
          </Link>
        </div>
      </div>
    </div>
  )
}