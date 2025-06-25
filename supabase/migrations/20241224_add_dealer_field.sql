-- Add dealer field to cars table
ALTER TABLE cars ADD COLUMN dealer VARCHAR(255);

-- Add index for dealer field for better performance
CREATE INDEX idx_cars_dealer ON cars(dealer);

-- Update the car_profit_analysis view to include dealer information
DROP VIEW IF EXISTS car_profit_analysis;

CREATE VIEW car_profit_analysis AS
SELECT 
    c.id,
    c.vin,
    c.make,
    c.model,
    c.year,
    c.status,
    c.dealer,
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
GROUP BY c.id, c.vin, c.make, c.model, c.year, c.status, c.dealer,
         c.purchase_price, c.purchase_currency, c.sale_price, c.sale_currency,
         c.purchase_date, c.sale_date;
