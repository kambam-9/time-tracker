export interface Employee {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  hourly_rate?: number;
  overtime_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Terminal {
  id: string;
  terminal_id: string;
  name: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClockEntry {
  id: string;
  employee_id: string;
  terminal_id?: string;
  clock_in: string;
  clock_out?: string;
  total_hours?: number;
  break_time?: number;
  is_overtime: boolean;
  notes?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  terminal?: Terminal;
}

export interface Schedule {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  employee_id: string;
  type: 'forgot_out' | 'overtime' | 'late' | 'early_out';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: any;
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  employee?: Employee;
}

export interface AuditLog {
  id: string;
  employee_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// For offline storage
export interface OfflineClockEntry {
  employee_id: string;
  terminal_id?: string;
  clock_in: string;
  clock_out?: string;
  notes?: string;
  offline_timestamp: string;
}