'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import ClockPad from '@/components/ClockPad';
import ManagerTable from '@/components/ManagerTable';

export default function HomePage() {
  const [activeView, setActiveView] = useState<'clock' | 'manager'>('clock');

  return (
    <Layout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex justify-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveView('clock')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'clock'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Time Clock
              </button>
              <button
                onClick={() => setActiveView('manager')}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeView === 'manager'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Manager View
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeView === 'clock' && <ClockPad />}
        {activeView === 'manager' && <ManagerTable />}
      </div>
    </Layout>
  );
}