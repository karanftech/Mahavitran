# Field Officer Electricity Bill Collection & Navigation System

A production-ready, full-stack enterprise application built for electricity department field officers and administrators. The application enables field officers to view assigned electricity consumers on interactive GIS maps, navigate turn-by-turn routes to customer meters, inspect 360° Street View panoramas, collect pending bill amounts, generate verified digital collection receipts, queue offline payments, and update backend financial balances in real-time.

---

## Technical Stack Overview

### Backend
- **Framework**: Python FastAPI (Async ASGI framework)
- **Database**: MongoDB (via Motor async driver & PyMongo with `2dsphere` spatial indexing)
- **Authentication**: JWT Bearer Tokens with Passlib/Bcrypt password hashing
- **Geospatial & Mapping**: Google Maps Platform (Routes API v2, Geocoding API) with OSRM street-level fallback routing

### Frontend
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Vanilla CSS + Tailwind CSS (glassmorphism design system, responsive mobile-first UI)
- **GIS Mapping Platform**: Google Maps JavaScript SDK with Marker Clustering, 360° Street View, and OpenStreetMap/Leaflet fallback
- **Icons**: Lucide React

---

## 🗺️ Google Cloud Platform Setup & Required APIs

To take full advantage of the Google Maps field navigation experience, enable the following APIs in your [Google Cloud Console](https://console.cloud.google.com/):

1. **Maps JavaScript API** (Frontend map rendering, custom markers, map layers & controls)
2. **Routes API v2** (Server-side traffic-aware route computation & step maneuvers)
3. **Street View Static / JS API** (360° panorama imagery verification & viewing)
4. **Geocoding API** (Address lookup and reverse geocoding)
5. **Places API** (Geographic location search)

### Security & API Key Restrictions
- **Browser Key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)**: Restrict in Google Cloud Console to HTTP Referrers (e.g. `http://localhost:3000/*` or your production domain) and restrict API access to *Maps JavaScript API* and *Street View Static API*.
- **Server Key (`GOOGLE_MAPS_SERVER_API_KEY`)**: Restrict to IP addresses of your backend API server and restrict access to *Routes API*.

---

## Project Structure

```
d:/Projects/New folder/
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI server entrypoint & CORS
│   │   ├── config.py                 # Pydantic environment configuration
│   │   ├── database.py               # Async Motor MongoDB client & 2dsphere indexes
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/                 # Business logic & Maps/Payment services
│   │   ├── routers/                  # REST API Endpoints (auth, customers, bills, payments, routes, officers)
│   │   └── utils/                    # Security & JWT dependencies
│   ├── requirements.txt              # Python dependencies
│   ├── seed_data.py                  # Seed script for initial DB data & admin/officer accounts
│   └── .env                          # Backend environment variables
│
└── frontend/
    ├── src/
    │   ├── app/                      # Next.js 14 App Router Pages
    │   │   ├── login/                # Authentication Portal
    │   │   ├── dashboard/            # Role-aware Officer & Admin Dashboards
    │   │   ├── map/                  # Google Maps Field Navigation & Turn-by-Turn Routing
    │   │   ├── customers/            # Consumer & Meter Directory & Profile Views
    │   │   ├── payments/             # Transaction Collection Logs & Digital Receipts
    │   │   ├── reports/              # Executive Revenue Analytics
    │   │   └── admin/officers/       # Officer Creation & Assignment Panel
    │   ├── components/               # Map, Payment, Receipt, Dashboard & UI components
    │   ├── services/                 # Google Maps, Route, Auth, Customer, Payment & Offline Services
    │   ├── hooks/                    # useAuth, useGeolocation, useNavigation, useStreetView, useOffline hooks
    │   ├── types/                    # TypeScript Data Interfaces
    │   └── utils/                    # Formatters & Haversine Distance Calculations
    ├── package.json
    ├── tailwind.config.js
    └── .env.local                    # Frontend environment variables
```

---

## Quick Start & Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MongoDB Server running on `mongodb://localhost:27017` (or MongoDB Atlas connection string)

---

### Step 1: Backend Setup

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Activate virtual environment:
   ```bash
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `backend/.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   DATABASE_NAME=electricity_collection
   JWT_SECRET=super-secret-jwt-key-change-in-production-2026
   GOOGLE_MAPS_SERVER_API_KEY=YOUR_GOOGLE_MAPS_SERVER_API_KEY_HERE
   ALLOWED_ORIGINS=http://localhost:3000
   ```

5. Seed database with initial field officers, meters, and bills:
   ```bash
   python seed_data.py
   ```

6. Start FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   - OpenAPI Documentation: `http://localhost:8000/docs`

---

### Step 2: Frontend Setup

1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_BROWSER_API_KEY_HERE
   ```

4. Launch Next.js dev server:
   ```bash
   npm run dev
   ```
   - Web App URL: `http://localhost:3000`

---

## Default Credentials

### Field Officer Account
- **Email**: `officer1@electricity.gov.in`
- **Password**: `officer123`

### Admin Account
- **Email**: `admin@electricity.gov.in`
- **Password**: `admin123`

---

## Key Features & Operational Flow

1. **Google Maps Field Navigation**: Uber/Rapido-style interface with browser Geolocation, heading cone rotation, and "You Are Here" indicator.
2. **Color-Coded Status Markers**:
   - 🔴 **RED**: High Priority / Overdue Bill
   - 🟡 **YELLOW**: Pending Payment
   - 🟢 **GREEN**: Paid / Collected Bill (Updates immediately after payment without reload)
   - 🔷 **BLUE**: Selected Navigation Destination
3. **Turn-by-Turn Navigation**: In-app navigation header & bottom step card featuring remaining distance, live ETA, next step maneuver, and automatic off-route detection (>75m deviation threshold) with auto-rerouting.
4. **360° Street View Panorama**: Allows officers to preview 360° street view imagery around delinquent customer meters prior to arrival.
5. **Map Styles & Controls**: Toggle between Default Roadmap, Satellite, Hybrid, and Terrain layers, with Follow-Me camera tracking and Recenter buttons.
6. **Payment Collection & Digital Receipts**: Supports Cash, UPI, Online, and Other payment methods with transaction references, validation rules, partial payment support, and printable digital collection receipts.
7. **Offline Sync Engine**: Queues offline collections in local browser storage when internet connection drops and auto-syncs upon reconnecting.
8. **Admin Management Panel**: Allows admins to create field officers, track collection performance, and assign consumers/meters to officers.
