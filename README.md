
# AutoGear Ke - Premium Car Accessories Nairobi

A modern, responsive e-commerce website for premium car accessories and interior upgrades in Kenya. Built with React, TypeScript, and Vite for the frontend, and PHP/MySQL for the backend API.

## Features

- **Product Catalog**: Browse premium car accessories including lighting, interior upgrades, and gadgets
- **Bundle Deals**: Exclusive accessory bundles with best value pricing
- **Admin Panel**: Secure admin interface for managing products and bundles
- **Responsive Design**: Mobile-first design optimized for all devices
- **Dark Mode**: Built-in theme toggle for better user experience
- **SEO Optimized**: Meta tags and structured data for search engines
- **WhatsApp Integration**: Direct contact buttons for customer inquiries
- **Testimonials**: Customer reviews and feedback section

## Tech Stack

### Frontend
- **React 19** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Custom Components** - Reusable UI components

### Backend
- **PHP** - Server-side scripting
- **MySQL** - Database management
- **REST API** - JSON-based API endpoints

## Prerequisites

- **Node.js** (v16 or higher)
- **PHP** (v7.4 or higher)
- **MySQL** (v5.7 or higher)
- **Web Server** (Apache/Nginx recommended)

## Installation & Setup

### Frontend Setup

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd AutoGearKe
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   - Copy `.env.example` to `.env` (if exists) or create environment variables as needed
   - No API keys required for basic functionality

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

5. **Build for production**:
   ```bash
   npm run build
   npm run preview
   ```

### Backend Setup

1. **Navigate to the API directory**:
   ```bash
   cd ../public_html
   ```

2. **Database Configuration**:
   - Create a MySQL database
   - Update `api/config.php` with your database credentials
   - Run the database schema (if provided)

3. **Web Server Configuration**:
   - Ensure PHP is enabled on your web server
   - Point your domain to the `public_html` directory
   - Configure URL rewriting for clean URLs (optional)

## Project Structure

```
AutoGear/
├── AutoGearKe/                 # Frontend React App
│   ├── components/             # Reusable React components
│   │   ├── ProductCard.tsx     # Product display component
│   │   ├── BundleCard.tsx      # Bundle display component
│   │   ├── Header.tsx          # Site header
│   │   ├── Footer.tsx          # Site footer
│   │   └── ...
│   ├── pages/                  # Page components
│   │   ├── HomePage.tsx        # Landing page
│   │   ├── GadgetsPage.tsx     # Gadgets catalog
│   │   └── AdminPage.tsx       # Admin dashboard
│   ├── utils/                  # Utility functions
│   ├── assets/                 # Static assets (images, icons)
│   ├── index.html              # HTML template
│   ├── constants.ts            # App constants
│   ├── types.ts                # TypeScript type definitions
│   ├── App.tsx                 # Main app component
│   ├── index.tsx               # App entry point
│   ├── package.json            # Dependencies and scripts
│   └── vite.config.ts          # Vite configuration
├── public_html/                # Backend PHP API
│   ├── api/                    # API endpoints
│   │   ├── config.php          # Database configuration
│   │   ├── db.php              # Database connection
│   │   ├── get-products.php    # Fetch products
│   │   ├── add-product.php     # Add new product
│   │   ├── update-product.php  # Update product
│   │   ├── delete-product.php  # Delete product
│   │   ├── get-bundles.php     # Fetch bundles
│   │   ├── add-bundle.php      # Add new bundle
│   │   ├── update-bundle.php   # Update bundle
│   │   ├── delete-bundle.php   # Delete bundle
│   │   ├── admin-login.php     # Admin authentication
│   │   └── upload.php          # File upload handler
│   └── uploads/                # Uploaded files directory
│       ├── .htaccess           # Security configuration
│       └── products/           # Product images
└── README.md                   # This file
```

## API Endpoints

### Products
- `GET /api/get-products.php` - Retrieve all products
- `POST /api/add-product.php` - Add new product (admin only)
- `POST /api/update-product.php` - Update existing product (admin only)
- `POST /api/delete-product.php` - Delete product (admin only)

### Bundles
- `GET /api/get-bundles.php` - Retrieve all bundles
- `POST /api/add-bundle.php` - Add new bundle (admin only)
- `POST /api/update-bundle.php` - Update existing bundle (admin only)
- `POST /api/delete-bundle.php` - Delete bundle (admin only)

### Authentication
- `POST /api/admin-login.php` - Admin login

### File Upload
- `POST /api/upload.php` - Upload product images

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use Tailwind CSS for styling
- Maintain consistent component structure

## Deployment

1. **Build the frontend**:
   ```bash
   cd AutoGearKe
   npm run build
   ```

2. **Deploy to web server**:
   - Upload `dist/` contents to your web server
   - Ensure API endpoints are accessible
   - Configure database on production server

3. **Environment Setup**:
   - Set production database credentials
   - Configure domain and SSL certificate

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary. All rights reserved.

## Contact

For inquiries about car accessories or business partnerships:
- **Location**: Nairobi, Kenya
- **WhatsApp**: [Contact via site]
- **Email**: [Contact information]

---

*Premium Car Accessories & Professional Installation Services in Kenya*
