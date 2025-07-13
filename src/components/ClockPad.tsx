'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { OfflineStorage, formatDateTime, isOnline } from '@/lib/utils';
import { Employee, Terminal } from '@/types';

export default function ClockPad() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchEmployees();
    fetchTerminals();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Try to sync offline entries when coming online
    const handleOnline = async () => {
      const offlineEntries = OfflineStorage.getEntries();
      if (offlineEntries.length > 0) {
        await syncOfflineEntries();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setMessage({ type: 'error', text: 'Failed to load employees' });
    }
  };

  const fetchTerminals = async () => {
    try {
      const { data, error } = await supabase
        .from('terminals')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTerminals(data || []);
    } catch (error) {
      console.error('Error fetching terminals:', error);
      setMessage({ type: 'error', text: 'Failed to load terminals' });
    }
  };

  const handleClockAction = async (action: 'in' | 'out') => {
    if (!selectedEmployee) {
      setMessage({ type: 'error', text: 'Please select an employee' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const now = formatDateTime(new Date());
      const employee = employees.find(e => e.id === selectedEmployee);
      
      if (!employee) {
        setMessage({ type: 'error', text: 'Employee not found' });
        return;
      }

      if (action === 'in') {
        await handleClockIn(employee, now);
      } else {
        await handleClockOut(employee, now);
      }

      // Reset form
      setSelectedEmployee('');
      setSelectedTerminal('');
      setNotes('');

    } catch (error) {
      console.error('Clock action error:', error);
      setMessage({ type: 'error', text: 'Failed to record time entry' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (employee: Employee, timestamp: string) => {
    if (isOnline()) {
      // Try online first
      const { error } = await supabase
        .from('clock_entries')
        .insert({
          employee_id: employee.id,
          terminal_id: selectedTerminal || null,
          clock_in: timestamp,
          notes: notes || null
        });

      if (error) throw error;
      setMessage({ type: 'success', text: `${employee.first_name} clocked in successfully` });
    } else {
      // Store offline
      OfflineStorage.addEntry({
        employee_id: employee.employee_id,
        terminal_id: terminals.find(t => t.id === selectedTerminal)?.terminal_id,
        clock_in: timestamp,
        notes: notes || undefined,
        offline_timestamp: timestamp
      });
      setMessage({ type: 'success', text: `${employee.first_name} clocked in (offline)` });
    }
  };

  const handleClockOut = async (employee: Employee, timestamp: string) => {
    // Find the latest open clock entry for this employee
    const { data: openEntry, error: queryError } = await supabase
      .from('clock_entries')
      .select('*')
      .eq('employee_id', employee.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) throw queryError;

    if (!openEntry) {
      if (isOnline()) {
        setMessage({ type: 'error', text: `${employee.first_name} is not currently clocked in` });
        return;
      } else {
        // Store offline clock out (assuming they clocked in offline)
        OfflineStorage.addEntry({
          employee_id: employee.employee_id,
          terminal_id: terminals.find(t => t.id === selectedTerminal)?.terminal_id,
          clock_in: timestamp, // This will need to be handled in sync
          clock_out: timestamp,
          notes: notes || undefined,
          offline_timestamp: timestamp
        });
        setMessage({ type: 'success', text: `${employee.first_name} clocked out (offline)` });
        return;
      }
    }

    // Update the entry with clock out time
    const { error } = await supabase
      .from('clock_entries')
      .update({
        clock_out: timestamp,
        notes: notes || null
      })
      .eq('id', openEntry.id);

    if (error) throw error;
    setMessage({ type: 'success', text: `${employee.first_name} clocked out successfully` });
  };

  const selectedEmployeeData = employees.find(e => e.id === selectedEmployee);

  const syncOfflineEntries = async () => {
    try {
      const offlineEntries = OfflineStorage.getEntries();
      if (offlineEntries.length === 0) return;

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: offlineEntries }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Sync result:', result);
        OfflineStorage.clearEntries();
        setMessage({ 
          type: 'success', 
          text: `Synced ${result.synced} offline entries` 
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Time Clock</h2>
          <div className="text-2xl font-mono text-gray-600">
            {currentTime.toLocaleTimeString('en-US', { 
              hour12: true,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <select
              id="employee"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name} ({employee.employee_id})
                </option>
              ))}
            </select>
          </div>

          {/* Terminal Selection */}
          <div>
            <label htmlFor="terminal" className="block text-sm font-medium text-gray-700 mb-2">
              Terminal (Optional)
            </label>
            <select
              id="terminal"
              value={selectedTerminal}
              onChange={(e) => setSelectedTerminal(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              disabled={loading}
            >
              <option value="">Select a terminal</option>
              {terminals.map((terminal) => (
                <option key={terminal.id} value={terminal.id}>
                  {terminal.name} - {terminal.location}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Add any notes about this time entry..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleClockAction('in')}
              disabled={loading || !selectedEmployee}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200"
            >
              {loading ? 'Processing...' : 'Clock In'}
            </button>
            <button
              onClick={() => handleClockAction('out')}
              disabled={loading || !selectedEmployee}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition duration-200"
            >
              {loading ? 'Processing...' : 'Clock Out'}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-4 rounded-md ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Employee Info */}
          {selectedEmployeeData && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Employee Information</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Department:</span> {selectedEmployeeData.department || 'N/A'}</p>
                <p><span className="font-medium">Position:</span> {selectedEmployeeData.position || 'N/A'}</p>
                <p><span className="font-medium">Overtime Threshold:</span> {selectedEmployeeData.overtime_threshold} hours</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}