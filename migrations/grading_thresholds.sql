-- Migration to add grading thresholds for Summer Trimester logic
ALTER TABLE gpa_formulas 
ADD COLUMN IF NOT EXISTS attendance_threshold DECIMAL(5,2) DEFAULT 70.0,
ADD COLUMN IF NOT EXISTS regterm_threshold DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS final_threshold DECIMAL(5,2) DEFAULT 50.0,
ADD COLUMN IF NOT EXISTS summer_trimester_rules JSONB DEFAULT '{}';

-- Add grading_component_id to assignments if not exists (it is already there based on init.sql, but just in case)
-- Actually, let's ensure it's linked correctly.
