-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE car_status AS ENUM ('in_transit', 'for_sale', 'sold', 'reserved');
CREATE TYPE expense_category AS ENUM ('purchase', 'transport', 'customs', 'repair', 'maintenance', 'marketing', 'office', 'other');
CREATE TYPE currency_type AS ENUM ('AED', 'USD', 'EUR', 'GBP');
CREATE TYPE user_role AS ENUM ('importer', 'exporter');

-- Create user_profiles table to store additional user information
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'importer',
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table
CREATE TABLE cars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vin VARCHAR(50) UNIQUE NOT NULL, -- Increased from 17 to allow non-standard VINs
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    engine_size VARCHAR(20),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    mileage INTEGER,

    -- Purchase information
    purchase_price DECIMAL(12,2) NOT NULL,
    purchase_currency currency_type NOT NULL DEFAULT 'AED',
    purchase_date DATE NOT NULL,
    purchase_location VARCHAR(255),
    dealer VARCHAR(255),

    -- Sale information
    sale_price DECIMAL(12,2),
    sale_currency currency_type DEFAULT 'AED',
    sale_date DATE,
    client_id UUID REFERENCES clients(id),

    -- Status and tracking
    status car_status NOT NULL DEFAULT 'in_transit',
    location VARCHAR(255),
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency currency_type NOT NULL DEFAULT 'AED',
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'invoice', 'photo', 'certificate', 'other'
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exchange_rates table for currency conversion
CREATE TABLE exchange_rates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    from_currency currency_type NOT NULL,
    to_currency currency_type NOT NULL,
    rate DECIMAL(10,6) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, date)
);

-- Create indexes for better performance
CREATE INDEX idx_cars_vin ON cars(vin);
CREATE INDEX idx_cars_status ON cars(status);
CREATE INDEX idx_cars_purchase_date ON cars(purchase_date);
CREATE INDEX idx_expenses_car_id ON expenses(car_id);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_documents_car_id ON documents(car_id);
CREATE INDEX idx_exchange_rates_currencies_date ON exchange_rates(from_currency, to_currency, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default exchange rates (you'll need to update these regularly)
INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES
('USD', 'AED', 3.67, CURRENT_DATE),
('EUR', 'AED', 4.00, CURRENT_DATE),
('GBP', 'AED', 4.60, CURRENT_DATE),
('AED', 'USD', 0.27, CURRENT_DATE),
('AED', 'EUR', 0.25, CURRENT_DATE),
('AED', 'GBP', 0.22, CURRENT_DATE);

-- Create views for analytics
CREATE VIEW car_profit_analysis AS
SELECT
    c.id,
    c.user_id,
    c.vin,
    c.make,
    c.model,
    c.year,
    c.status,
    c.purchase_price,
    c.purchase_currency,
    c.sale_price,
    c.sale_currency,
    COALESCE(SUM(e.amount * CASE
        WHEN e.currency = 'AED' THEN 1
        WHEN e.currency = 'USD' THEN 3.67
        WHEN e.currency = 'EUR' THEN 4.00
        WHEN e.currency = 'GBP' THEN 4.60
        ELSE 1
    END), 0) AS total_expenses_aed,
    CASE
        WHEN c.status = 'sold' THEN
            (c.sale_price * CASE
                WHEN c.sale_currency = 'AED' THEN 1
                WHEN c.sale_currency = 'USD' THEN 3.67
                WHEN c.sale_currency = 'EUR' THEN 4.00
                WHEN c.sale_currency = 'GBP' THEN 4.60
                ELSE 1
            END) -
            (c.purchase_price * CASE
                WHEN c.purchase_currency = 'AED' THEN 1
                WHEN c.purchase_currency = 'USD' THEN 3.67
                WHEN c.purchase_currency = 'EUR' THEN 4.00
                WHEN c.purchase_currency = 'GBP' THEN 4.60
                ELSE 1
            END) -
            COALESCE(SUM(e.amount * CASE
                WHEN e.currency = 'AED' THEN 1
                WHEN e.currency = 'USD' THEN 3.67
                WHEN e.currency = 'EUR' THEN 4.00
                WHEN e.currency = 'GBP' THEN 4.60
                ELSE 1
            END), 0)
        ELSE NULL
    END AS profit_aed,
    c.purchase_date,
    c.sale_date,
    CASE
        WHEN c.status = 'sold' AND c.sale_date IS NOT NULL THEN
            c.sale_date - c.purchase_date
        ELSE NULL
    END AS days_to_sell
FROM cars c
LEFT JOIN expenses e ON c.id = e.car_id
GROUP BY c.id, c.user_id, c.vin, c.make, c.model, c.year, c.status,
         c.purchase_price, c.purchase_currency, c.sale_price, c.sale_currency,
         c.purchase_date, c.sale_date;

-- Row Level Security (RLS) policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (users can only access their own profile)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies (for now, allow all authenticated users)
CREATE POLICY "Allow all operations for authenticated users" ON cars FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON documents FOR ALL USING (auth.role() = 'authenticated');

-- Create function to automatically create user profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, role, full_name)
    VALUES (
        NEW.id,
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'importer'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
