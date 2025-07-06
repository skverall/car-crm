-- Migration: Add photo_url field to cars table
-- This migration adds a photo_url field to store the main photo of each car

-- Add photo_url column to cars table
ALTER TABLE cars ADD COLUMN photo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN cars.photo_url IS 'URL to the main photo of the car stored in Supabase Storage';

-- Create index for better performance when filtering by cars with photos
CREATE INDEX IF NOT EXISTS idx_cars_photo_url ON cars(photo_url) WHERE photo_url IS NOT NULL;

-- Update the car_profit_analysis view to include photo_url
DROP VIEW IF EXISTS car_profit_analysis;

CREATE VIEW car_profit_analysis AS
SELECT
    c.id,
    c.user_id,
    c.vin,
    c.make,
    c.model,
    c.year,
    c.status,
    c.photo_url,
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
         c.photo_url, c.purchase_price, c.purchase_currency, c.sale_price, c.sale_currency,
         c.purchase_date, c.sale_date;

-- Add comment to the view
COMMENT ON VIEW car_profit_analysis IS 'View that calculates profit analysis for cars including photo URLs';

-- Final status
DO $$
BEGIN
    RAISE NOTICE '=== PHOTO URL FIELD ADDED ===';
    RAISE NOTICE 'Added photo_url column to cars table';
    RAISE NOTICE 'Updated car_profit_analysis view to include photo_url';
    RAISE NOTICE 'Created index for better performance';
END $$;
