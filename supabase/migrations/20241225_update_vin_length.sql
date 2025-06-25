-- Migration to update VIN column length from 17 to 50 characters
-- This allows non-standard VIN lengths while maintaining uniqueness

-- Update the VIN column to allow up to 50 characters
ALTER TABLE cars ALTER COLUMN vin TYPE VARCHAR(50);

-- Add a comment to document the change
COMMENT ON COLUMN cars.vin IS 'Vehicle Identification Number - allows non-standard lengths up to 50 characters';
