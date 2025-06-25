# Car CRM - Vehicle Inventory Management System

A professional CRM system for car dealerships with VIN tracking, financial analytics, and profit calculations.

## 🚗 Demo Access Available
Use the **Demo Login** button for instant access without registration!
- Email: `aydmaxx@gmail.com`
- Password: `Demo1234`

## 🚗 Features

- **VIN-based Car Tracking**: Each vehicle is tracked by unique VIN with complete history
- **Financial Analytics**: Automatic profit/loss calculations with multi-currency support
- **Status Management**: Track cars through "in transit", "for sale", "sold", "reserved" statuses
- **Expense Tracking**: Detailed expense categorization (purchase, transport, customs, repair, etc.)
- **Multi-Currency Support**: AED, USD, EUR, GBP with automatic conversion
- **Document Management**: Store invoices, photos, certificates for each vehicle
- **Real-time Dashboard**: Live statistics and filtering capabilities
- **Client Management**: Track sales and customer relationships

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: Radix UI, Lucide React
- **Charts**: Recharts
- **Authentication**: Supabase Auth

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd car-crm
npm install
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your keys
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Setup Database

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL to create all tables, views, and policies

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema

### Core Tables

- **cars**: Vehicle inventory with purchase/sale information
- **expenses**: All costs associated with vehicles
- **clients**: Customer information
- **documents**: File storage references
- **exchange_rates**: Currency conversion rates

### Key Features

- **Row Level Security (RLS)**: Secure data access
- **Automatic Timestamps**: Created/updated tracking
- **Currency Conversion**: Built-in exchange rate handling
- **Profit Analysis View**: Pre-calculated profit metrics

## 💰 Financial Calculations

The system automatically calculates:

- **Total Expenses**: Sum of all costs per vehicle in AED
- **Profit/Loss**: Sale price - (Purchase price + Expenses)
- **ROI**: Return on investment percentage
- **Margin**: Profit margin percentage
- **Days to Sell**: Time from purchase to sale

## 🔧 Usage

### Adding a New Car

1. Click "Add Car" in the dashboard
2. Enter VIN (17-character validation)
3. Fill in vehicle details and purchase information
4. Set initial status

### Tracking Expenses

1. Select a vehicle from the inventory
2. Add expenses by category
3. Upload receipts and documents
4. View real-time profit calculations

### Managing Sales

1. Update car status to "sold"
2. Enter sale price and client information
3. System automatically calculates profit metrics
4. Track performance analytics

## 🌍 Multi-Currency Support

Default exchange rates (update regularly):
- USD to AED: 3.67
- EUR to AED: 4.00
- GBP to AED: 4.60

All profit calculations are normalized to AED for consistency.

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔒 Security

- Supabase Authentication
- Row Level Security (RLS)
- Secure file uploads
- Environment variable protection

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed on any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform

## 📈 Future Enhancements

- [ ] Advanced analytics and reporting
- [ ] Automated email notifications
- [ ] Integration with external APIs (car valuation, etc.)
- [ ] Mobile app version
- [ ] Advanced filtering and search
- [ ] Bulk operations
- [ ] Export functionality (PDF, Excel)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the database schema

---

**Built with ❤️ for car dealership professionals**
