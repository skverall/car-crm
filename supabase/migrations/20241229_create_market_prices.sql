-- Create Market Prices table for tracking vehicle market values
-- This table allows manual tracking of market prices for different car models

-- Create enum for vehicle condition
CREATE TYPE vehicle_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

-- Create market_prices table
CREATE TABLE market_prices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Vehicle information
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 2),
    mileage INTEGER CHECK (mileage >= 0),
    condition vehicle_condition NOT NULL,
    
    -- Price information
    market_price DECIMAL(12,2) NOT NULL CHECK (market_price > 0),
    currency currency_type NOT NULL DEFAULT 'AED',
    
    -- Source and notes
    source VARCHAR(255), -- e.g., "Dubizzle", "YallaMotor", "AutoTrader"
    notes TEXT,
    
    -- Metadata
    date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_market_prices_user_id ON market_prices(user_id);
CREATE INDEX idx_market_prices_make_model ON market_prices(make, model);
CREATE INDEX idx_market_prices_year ON market_prices(year);
CREATE INDEX idx_market_prices_date_updated ON market_prices(date_updated);
CREATE INDEX idx_market_prices_make_model_year ON market_prices(make, model, year);

-- Enable Row Level Security
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own market price records
CREATE POLICY "Users can view own market prices" ON market_prices
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own market price records
CREATE POLICY "Users can insert own market prices" ON market_prices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own market price records
CREATE POLICY "Users can update own market prices" ON market_prices
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own market price records
CREATE POLICY "Users can delete own market prices" ON market_prices
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_market_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_market_prices_updated_at
    BEFORE UPDATE ON market_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_market_prices_updated_at();
