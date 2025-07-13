-- Initial schema for Employee Time Tracking System

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(50),
    hourly_rate DECIMAL(10,2),
    overtime_threshold INTEGER DEFAULT 8, -- hours per day
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Terminals table
CREATE TABLE terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clock entries table
CREATE TABLE clock_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    terminal_id UUID REFERENCES terminals(id),
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    break_time DECIMAL(5,2) DEFAULT 0,
    is_overtime BOOLEAN DEFAULT false,
    notes TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, day_of_week)
);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'forgot_out', 'overtime', 'late', 'early_out'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    message TEXT NOT NULL,
    details JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_clock_entries_employee_id ON clock_entries(employee_id);
CREATE INDEX idx_clock_entries_clock_in ON clock_entries(clock_in);
CREATE INDEX idx_clock_entries_clock_out ON clock_entries(clock_out);
CREATE INDEX idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX idx_alerts_employee_id ON alerts(employee_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_audit_logs_employee_id ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Functions to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_terminals_updated_at BEFORE UPDATE ON terminals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clock_entries_updated_at BEFORE UPDATE ON clock_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total hours when clock_out is updated
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
        NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0 - COALESCE(NEW.break_time, 0);
        
        -- Check if it's overtime (more than employee's overtime threshold)
        SELECT overtime_threshold INTO NEW.is_overtime 
        FROM employees 
        WHERE id = NEW.employee_id 
        AND NEW.total_hours > overtime_threshold;
        
        IF NEW.is_overtime IS NULL THEN
            NEW.is_overtime = false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_hours_trigger BEFORE INSERT OR UPDATE ON clock_entries FOR EACH ROW EXECUTE FUNCTION calculate_total_hours();

-- Alert detection functions
CREATE OR REPLACE FUNCTION detect_forgot_clockouts()
RETURNS TABLE (
    employee_id UUID,
    type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.employee_id,
        'forgot_out'::VARCHAR(50) as type,
        'high'::VARCHAR(20) as severity,
        'Employee forgot to clock out' as message,
        jsonb_build_object(
            'clock_in', ce.clock_in,
            'hours_since_clock_in', EXTRACT(EPOCH FROM (NOW() - ce.clock_in)) / 3600.0
        ) as details
    FROM clock_entries ce
    JOIN employees e ON ce.employee_id = e.id
    WHERE ce.clock_out IS NULL 
    AND ce.clock_in < NOW() - INTERVAL '12 hours'
    AND e.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = ce.employee_id 
        AND a.type = 'forgot_out'
        AND a.created_at > ce.clock_in
        AND a.is_resolved = false
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_overtime()
RETURNS TABLE (
    employee_id UUID,
    type VARCHAR(50),
    severity VARCHAR(20),
    message TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.employee_id,
        'overtime'::VARCHAR(50) as type,
        'medium'::VARCHAR(20) as severity,
        'Employee worked overtime' as message,
        jsonb_build_object(
            'hours_worked', ce.total_hours,
            'overtime_threshold', e.overtime_threshold,
            'date', DATE(ce.clock_in)
        ) as details
    FROM clock_entries ce
    JOIN employees e ON ce.employee_id = e.id
    WHERE ce.is_overtime = true
    AND ce.clock_out IS NOT NULL
    AND e.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM alerts a 
        WHERE a.employee_id = ce.employee_id 
        AND a.type = 'overtime'
        AND DATE(a.created_at) = DATE(ce.clock_in)
        AND a.is_resolved = false
    );
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        employee_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        COALESCE(NEW.employee_id, OLD.employee_id),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to relevant tables
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_clock_entries AFTER INSERT OR UPDATE OR DELETE ON clock_entries FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_schedules AFTER INSERT OR UPDATE OR DELETE ON schedules FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Row Level Security (RLS) Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic policies (can be customized based on your auth setup)
-- Allow service role to do everything
CREATE POLICY "Service role can do everything" ON employees FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON terminals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON clock_entries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON schedules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON alerts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do everything" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own data
CREATE POLICY "Users can read own employee data" ON employees FOR SELECT USING (auth.uid()::text = employee_id OR auth.role() = 'manager');
CREATE POLICY "Users can read terminals" ON terminals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage own clock entries" ON clock_entries FOR ALL USING (employee_id IN (SELECT id FROM employees WHERE employee_id = auth.uid()::text));
CREATE POLICY "Users can read own schedules" ON schedules FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE employee_id = auth.uid()::text));
CREATE POLICY "Users can read own alerts" ON alerts FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE employee_id = auth.uid()::text));

-- Insert sample data
INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hourly_rate, overtime_threshold) VALUES
('EMP001', 'John', 'Doe', 'john.doe@company.com', 'Engineering', 'Software Developer', 35.00, 8),
('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Marketing', 'Marketing Manager', 45.00, 8),
('EMP003', 'Bob', 'Johnson', 'bob.johnson@company.com', 'Operations', 'Operations Lead', 40.00, 8);

INSERT INTO terminals (terminal_id, name, location) VALUES
('TERM001', 'Main Entrance', 'Building A - Main Entrance'),
('TERM002', 'Employee Break Room', 'Building A - 2nd Floor'),
('TERM003', 'Warehouse Entry', 'Building B - Warehouse');

-- Insert sample schedules (Monday to Friday, 9 AM to 5 PM)
INSERT INTO schedules (employee_id, day_of_week, start_time, end_time) 
SELECT e.id, dow, '09:00:00', '17:00:00'
FROM employees e
CROSS JOIN generate_series(1, 5) as dow
WHERE e.employee_id IN ('EMP001', 'EMP002', 'EMP003');