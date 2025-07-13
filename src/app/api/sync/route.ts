import { NextRequest, NextResponse } from 'next/server';
import { OfflineClockEntry } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { entries } = await request.json() as { entries: OfflineClockEntry[] };

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Invalid entries format' },
        { status: 400 }
      );
    }

    // Call the Supabase Edge Function for offline sync
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/offline-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ entries }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { error: 'Failed to sync offline entries' },
      { status: 500 }
    );
  }
}