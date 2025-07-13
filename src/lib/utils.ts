import { OfflineClockEntry } from '@/types';

const STORAGE_KEY = 'offline_clock_entries';

export class OfflineStorage {
  static getEntries(): OfflineClockEntry[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading offline entries:', error);
      return [];
    }
  }

  static addEntry(entry: OfflineClockEntry): void {
    if (typeof window === 'undefined') return;
    
    try {
      const entries = this.getEntries();
      entries.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error storing offline entry:', error);
    }
  }

  static clearEntries(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing offline entries:', error);
    }
  }

  static getCount(): number {
    return this.getEntries().length;
  }
}

export const formatDateTime = (date: Date): string => {
  return date.toISOString();
};

export const formatTime = (time: string): string => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const calculateHours = (clockIn: string, clockOut: string): number => {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

export const isOnline = (): boolean => {
  return typeof window !== 'undefined' && navigator.onLine;
};