import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClockIn = async () => {
    if (!pin) {
      setMessage('Please enter your PIN')
      return
    }
    
    setLoading(true)
    try {
      // TODO: Implement actual clock-in logic with Supabase
      setMessage(`Clocked in with PIN: ${pin}`)
      setPin('')
    } catch (error) {
      setMessage('Error clocking in')
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!pin) {
      setMessage('Please enter your PIN')
      return
    }
    
    setLoading(true)
    try {
      // TODO: Implement actual clock-out logic with Supabase
      setMessage(`Clocked out with PIN: ${pin}`)
      setPin('')
    } catch (error) {
      setMessage('Error clocking out')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center mb-6">Time Tracker</h1>
        
        <div className="mb-4">
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
            Enter PIN
          </label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="****"
            maxLength={4}
          />
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Clock In'}
          </button>
          
          <button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Clock Out'}
          </button>
        </div>

        {message && (
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-500 hover:text-blue-600 text-sm">
            Manager Login
          </a>
        </div>
      </div>
    </div>
  )
}