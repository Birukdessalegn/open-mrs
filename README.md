# OpenMRS Pro - Professional Healthcare Management System

A modern, comprehensive healthcare management system built with Next.js, TypeScript, and Supabase. This system provides a complete Electronic Medical Records (EMR) solution with patient management, appointments, billing, laboratory, and pharmacy modules.

## 🏥 Features

### Core Modules
- **Patient Management**: Complete patient demographics, medical history, and records
- **Appointment Scheduling**: Advanced scheduling with doctor assignment and status tracking
- **Electronic Medical Records (EMR)**: Visit notes, diagnoses, prescriptions, and vital signs
- **Laboratory Management**: Lab test ordering, results tracking, and reporting
- **Billing & Invoicing**: Comprehensive billing system with payment tracking
- **Pharmacy Management**: Medication inventory, stock tracking, and prescription fulfillment
- **User Management**: Role-based access control with audit trails

### Professional Features
- **Audit Trails**: Complete data change tracking for compliance
- **Role-Based Access**: Admin, Doctor, Lab Tech, Pharmacist, Receptionist roles
- **Data Validation**: Healthcare-specific validation rules and constraints
- **Real-time Updates**: Live data synchronization across modules
- **Responsive Design**: Mobile-friendly interface for all devices
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🚀 Technology Stack

- **Frontend**: Next.js 13, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **UI Components**: Radix UI, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics and reporting
- **Icons**: Lucide React
- **Deployment**: Vercel-ready

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd open-mrs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_NAME=OpenMRS Pro
   NEXT_PUBLIC_CLINIC_NAME=Your Clinic Name
   ```

4. **Set up Supabase database**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Initialize Supabase (if not already done)
   supabase init
   
   # Start local Supabase (optional)
   supabase start
   
   # Run migrations
   supabase migration up
   ```

5. **Generate TypeScript types**
   ```bash
   npm run db:generate
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

## 🗄️ Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

### Core Tables
- **profiles**: User management with role-based access
- **patients**: Patient demographics and medical information
- **appointments**: Appointment scheduling and tracking
- **visits**: Clinical visits and EMR data
- **prescriptions**: Medication prescriptions
- **medical_documents**: Lab results and medical documents

### Laboratory
- **lab_tests**: Available laboratory tests catalog
- **lab_orders**: Lab test orders and tracking
- **lab_order_items**: Individual test results

### Billing
- **services**: Billable services catalog
- **invoices**: Patient invoices and billing
- **invoice_items**: Invoice line items
- **payments**: Payment transactions

### Pharmacy
- **medications**: Medication catalog
- **medication_stock**: Inventory management
- **stock_transactions**: Stock movement tracking

### Audit & Compliance
- **audit_logs**: Complete audit trail for all data changes

## 🏗️ Project Structure

```
open-mrs/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Main application pages
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── src/                  # Source code organization
│   ├── components/       # Custom components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── lib/                  # Library configurations
├── supabase/            # Database migrations
└── public/              # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run typecheck` - Run TypeScript checks
- `npm run test` - Run tests
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate TypeScript types from database
- `npm run db:reset` - Reset database
- `npm run db:migrate` - Run database migrations

## 👥 User Roles & Permissions

### Admin
- Full system access
- User management
- System configuration
- Audit trail access

### Doctor
- Patient management
- Appointment scheduling
- EMR and visit records
- Prescription management
- Lab test ordering

### Lab Tech
- Lab test management
- Result entry and tracking
- Lab order processing

### Pharmacist
- Medication management
- Inventory tracking
- Prescription fulfillment
- Stock management

### Receptionist
- Patient registration
- Appointment scheduling
- Basic patient information access

## 🔒 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Role-based Access Control**: Fine-grained permissions
- **Audit Trails**: Complete data change tracking
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Secure error management
- **Session Management**: Secure authentication

## 📊 Analytics & Reporting

The system includes comprehensive analytics:
- Patient demographics and trends
- Appointment scheduling analytics
- Revenue and billing reports
- Laboratory test statistics
- Pharmacy inventory reports
- User activity monitoring

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
NEXTAUTH_SECRET=your_production_secret
NEXT_PUBLIC_APP_NAME=OpenMRS Pro
NEXT_PUBLIC_CLINIC_NAME=Your Clinic Name
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation in `/docs/api`

## 🔄 Version History

- **v1.0.0** - Initial release with core EMR functionality
- **v1.1.0** - Added laboratory management
- **v1.2.0** - Enhanced billing system
- **v1.3.0** - Pharmacy management module

## 🏥 Healthcare Compliance

This system is designed with healthcare compliance in mind:
- **HIPAA Considerations**: Secure data handling and access controls
- **Audit Trails**: Complete data change tracking
- **Data Validation**: Healthcare-specific validation rules
- **Backup & Recovery**: Regular data backup procedures
- **Access Logging**: User activity monitoring

---

**Note**: This is a healthcare application. Ensure compliance with local healthcare regulations and data protection laws before deployment in a production environment.