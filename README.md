# GradeX By Stark

A modern, tech-inspired grade planning tool for tracking semester courses, calculating SGPA, and determining required semester exam scores to achieve target grades. Built with a sleek dark theme and Iron Man-inspired aesthetics.

🌐 **Live Demo**: [https://www.gradex.bond](https://www.gradex.bond) | [https://gradex.vercel.app](https://gradex.vercel.app)

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

## ✨ Features

### GradeX Planner
- 📊 **SGPA Calculator**: Automatically calculates Semester Grade Point Average based on included courses
- 🎯 **Smart Goal Calculator**: Auto-calculates required semester exam score based on selected target grade with dynamic percentage display
- 📝 **Course Management**: Add, edit, and remove courses with custom credits and scores
- 💾 **Local Storage**: All data persists in browser localStorage
- 🎨 **Modern UI**: Dark brutalist theme with monochrome aesthetic and smooth animations
- 🔄 **Reset Function**: Restore default courses with one click
- 🚀 **Entry Animation**: Tech-inspired splash screen with Arc Reactor animation
- 🎵 **Easter Egg**: Hidden play button for music
- 📱 **Fully Responsive**: Optimized for all devices (mobile, tablet, desktop)
- 🎓 **Grade Tracking**: Supports both incomplete (60 marks) and complete (100 marks) courses

### SRMIST Seat Finder (v3.1)
- ⚡ **Ultra-Fast Performance**: Sub-1-second response times with global cache system
  - **Global Cache**: Pre-fetches all campus data and caches for 1 hour (Upstash Redis)
  - **Fast Fail**: Instant responses (<1s) when RA not found in fresh cache
  - **Smart Caching**: In-memory → Redis → Direct fetch fallback chain
  - **Early Exit**: Stops fetching once RA is found
- 🔍 **Live Real-Time Fetch**: Data fetched with high frequency and utmost accuracy
- 🏫 **Multi-Campus Support**: Searches across Main Campus, Tech Park, Tech Park 2, Biotech & Architecture, and University Building
- 🛡️ **Bot Protection**: Advanced rate limiting and pattern detection (no CAPTCHA required)
  - Rate limiting (30 requests/minute)
  - Sequential RA pattern detection
  - Request timing analysis
  - IP-based blocking
- 🗄️ **Supabase Integration**: PostgreSQL database with 6,177+ student records for fast, reliable name lookups
- 📋 **Complete Information**: Displays Name (proper case), Seat No., Room/Venue, Floor, Department, Subject Code, and Session
- 🎨 **Smart Room Formatting**: 
  - Automatically formats room names (TPTP→TP, TPVPT→VPT, TP-2LH→LH)
  - Removes redundant prefixes for cleaner display
- 🏢 **Floor Detection**: Smart extraction of floor numbers from room names (e.g., TP-401 → 4th floor, H301F → 3rd floor)
- 📸 **Venue Images**: Aesthetic venue maps for Main Campus (MC), UB, TP, TP2, and VPT buildings with hover effects
- ✅ **RA Validation**: Real-time validation ensures complete RA numbers before searching
- 📱 **Mobile Optimized**: Fully responsive with touch-friendly interface, optimized font sizes, and horizontal table scrolling
- 🖥️ **Desktop Optimized**: Compact font sizes ensure room names like "VPT-009" display on single line
- 📧 **Support Contact**: Easy access to support email for inquiries
- 🎉 **Easter Eggs**: Fun bouncing animations for special RA numbers

### FeedFill (NEW)
- 🔗 **Chrome Extension Integration**: Direct link to SRM Academia Course Feedback Filler extension
- 📖 **Usage Guide**: Step-by-step instructions with visual screenshots
- 🎯 **One-Click Access**: Quick links to Chrome Web Store and SRM Academia feedback page
- 👨‍💻 **Creator Credits**: Links to extension creator's GitHub profile

### Admin Portal
- 📊 **Real-Time Dashboard**: Monitor live seat-search activity with automatic 15-second refresh
- 📈 **Analytics**: View total searches, successful/failed counts, and found rate
- 📋 **Pagination**: Browse latest 500 enquiries across multiple pages (50 per page)
- 📱 **Mobile Responsive**: Horizontal scrolling table with sticky ID column
- 🔄 **Auto-Refresh**: Data updates automatically every 15 seconds
- 📥 **Export**: Download current page data as CSV
- 🎯 **Accurate Metrics**: Latest ID tracking ensures accurate total search counts

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/StarkAg/GradeX.git
cd GradeX
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173/`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## 📖 Usage

### GradeX Planner
1. **View Courses**: All courses are displayed in cards showing current scores, credits, and target grades
2. **Select Target Grade**: For incomplete courses (60 marks), select your target grade (C, B, B+, A, A+, O) to see required exam marks
3. **Auto-Calculated Goals**: The required semester exam score is automatically calculated and displayed with percentage
4. **Edit Courses**: Click "Edit" on any course card to modify title, credits, or internals
5. **Add Courses**: Click "Add course" to add new courses with status (60/100 marks)
6. **Include/Exclude**: Toggle courses in/out of SGPA calculation
7. **Complete Courses**: Courses with 100 marks automatically show achieved grade (no exam needed)
8. **Help Guide**: Click the "?" button for quick usage guide

### SRMIST Seat Finder
1. **Enter Details**: Input your complete Register Number (RA number) and exam date
2. **Date Navigation**: Use arrow buttons to navigate between dates, or enter custom date (DD/MM/YYYY)
3. **RA Validation**: Real-time validation ensures you enter a complete RA number (minimum 12 characters)
4. **Find Seat**: Click "Find My Seat" to search across all campuses
5. **View Results**: See complete seat information including:
   - Student Name (proper case formatting from Supabase database)
   - Seat Number
   - Room/Venue with building name (automatically formatted)
   - Floor number (extracted from room name)
   - Department and Subject Code
   - Session (Forenoon/Afternoon)
6. **Auto-Refresh**: Seat information automatically updates every 3 minutes
7. **Venue Maps**: View venue layout images for MC, UB, TP, TP2, and VPT buildings
8. **Support**: Contact ha1487@srmist.edu.in for any problems or inquiries

### FeedFill
1. **Install Extension**: Click "Open Chrome Web Store" to install the SRM Academia Course Feedback Filler extension
2. **Navigate to Academia**: Click "Open SRM Academia" to go to the course feedback page
3. **Follow Guide**: Use the step-by-step usage guide with screenshots
4. **Fill Feedback**: Use the extension to auto-fill rating and comment fields
5. **Submit**: Review and submit the form manually

### Admin Portal
Access the admin dashboard at `https://www.gradex.bond/admin` (hidden from public navigation)

1. **View Statistics**: See total searches, successful/failed counts, and found rate
2. **Browse Enquiries**: Navigate through paginated results (50 per page)
3. **Export Data**: Download current page as CSV
4. **Auto-Refresh**: Data updates automatically every 15 seconds
5. **Mobile Access**: Fully responsive with horizontal scrolling on mobile devices

## 📊 Grade Scale

- **F**: < 50% (0 points)
- **C**: ≥ 50% (5 points)
- **B**: ≥ 56% (6 points)
- **B+**: ≥ 61% (7 points)
- **A**: ≥ 71% (8 points)
- **A+**: ≥ 81% (9 points)
- **O**: ≥ 91% (10 points)

## 🎯 Calculation Logic

- **Incomplete Courses (60 marks)**: Current score is out of 60 internal marks. Exam contributes 40 marks out of 100 total. Required exam marks are calculated to achieve target grade.
- **Complete Courses (100 marks)**: Final grade is calculated directly from the score. No exam needed.

## 🛠️ Technology Stack

### Frontend
- **React 18**: UI framework with React Router for client-side routing
- **Vite**: Build tool and dev server
- **CSS3**: Custom styling with animations and responsive design
- **LocalStorage API**: Data persistence
- **Vercel Analytics**: Performance and usage tracking

### Backend (Seat Finder API)
- **Node.js**: Serverless functions
- **Vercel Functions**: API endpoints
- **Upstash Redis**: Global cache system for ultra-fast lookups
  - 1-hour cache TTL with lazy refresh
  - Persistent storage across serverless restarts
  - Cache hit/miss tracking and monitoring
- **Supabase**: PostgreSQL database for student data (6,177+ records)
  - Fast indexed queries for student name lookups
  - Reliable data access in serverless environment
  - Admin tools for data management
- **HTML Scraping**: Real-time data extraction from SRM exam cell
- **Performance Optimizations**:
  - Global campus data cache (all RAs pre-fetched)
  - Fast fail mode for non-existent RAs (<1s response)
  - Early exit when RA found
  - Session-scoped caching (Map-based)
  - Request deduplication (prevents concurrent duplicates)
  - Reduced timeouts for failure cases (3s vs 12s)
- **Bot Protection**: Rate limiting, pattern detection, and IP blocking
- **Multi-Campus Support**: Sequential fetching from 5 campus endpoints with polite delays
- **Error Handling**: Comprehensive error handling and retry logic

## 🎨 Design

- Dark theme (#020202 background)
- Monochrome color palette
- Bebas Neue & Space Grotesk fonts
- Brutalist aesthetic
- Smooth animations and transitions
- Fully responsive grid layouts
- Proper case formatting for all text

## 📱 Responsive Design

- **Desktop**: 3-4 column grid layout with smooth animations, optimized font sizes
- **Tablet**: 2 column grid layout
- **Mobile**: Single column layout with optimized touch targets, horizontal scrolling tables
- **Touch Optimized**: Larger touch targets, swipe-friendly date navigation
- **Adaptive Typography**: Fluid typography using `clamp()` for all screen sizes

## 🎁 Easter Eggs

- Hidden play button next to Arc Reactor icon (plays Iron Man theme)
- Bouncing "EWW!!" message for RA2311003012233
- Bouncing "MONNIES!!" message for RA2311003010432
- Bouncing "Mogger!!" message for RA2311003012190
- Arc Reactor pulsing animation on splash screen

## 📸 Screenshots

![Seat Finder Mobile View](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-1-mobile-seatfinder.png)
*Mobile-optimized Seat Finder interface*

![Seat Finder Desktop View](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-2-desktop-seatfinder.png)
*Desktop view with venue map images*

![Admin Portal Dashboard](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-3-admin-portal.png)
*Real-time admin dashboard with analytics*

![FeedFill Feature](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-4-feedfill.png)
*FeedFill Chrome extension integration*

![GradeX Planner](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-5-gradex-planner.png)
*GradeX SGPA calculator interface*

![Mobile Responsive Design](https://raw.githubusercontent.com/StarkAg/GradeX/main/public/SS/screenshot-6-mobile-responsive.png)
*Fully responsive mobile experience*

## 👨‍💻 Creator

**Harsh Agarwal (Stark)**

- GitHub: [@StarkAg](https://github.com/StarkAg)
- LinkedIn: [harshxagarwal](https://in.linkedin.com/in/harshxagarwal)

## 🔧 Development

### Environment Variables

For local development, create a `.env.local` file:

```env
# Supabase (for student data and enquiries)
SUPABASE_URL=https://phlggcheaajkupppozho.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For admin operations only

# Upstash Redis (for global cache - via Vercel Marketplace)
UPSTASH_REDIS__KV_REST_API_URL=your-redis-url
UPSTASH_REDIS__KV_REST_API_TOKEN=your-redis-token
```

### API Endpoints

- `/api/seating` - Main seat finding endpoint (ultra-fast with global cache)
- `/api/get-name-by-last-digits` - Student name lookup
- `/api/subjects` - Subject code to name mapping
- `/api/log-enquiry` - Log search queries
- `/api/admin-enquiries` - Admin dashboard data (requires service role key)
- `/api/cache-status` - Cache monitoring and statistics

### Project Structure

```
GradeX/
├── src/
│   ├── components/
│   │   ├── SeatFinder.jsx    # Main seat finding component
│   │   ├── GradeX.jsx        # SGPA calculator
│   │   ├── FeedFill.jsx      # FeedFill feature page
│   │   └── AdminPortal.jsx   # Admin dashboard
│   ├── App.jsx               # Main app with routing
│   ├── main.jsx              # Entry point
│   └── styles.css            # Global styles
├── api/
│   ├── seating.js            # Main seating API
│   ├── seating-utils.js      # Seating utilities
│   ├── admin-enquiries.js    # Admin API
│   └── supabase-client.js   # Supabase configuration
├── public/                   # Static assets
│   ├── SS/                   # Screenshots
│   └── [venue images]        # MC.jpg, TP.jpg, TP2.JPG, UB.png, VPT.JPG
└── vercel.json               # Vercel deployment config
```

## 📝 Recent Updates (v3.1)

- ⚡ **Ultra-Fast Global Cache**: Sub-1-second response times with Upstash Redis
  - Pre-fetches all campus data and caches for 1 hour
  - Fast fail mode for non-existent RAs (<1s)
  - Cache monitoring endpoint for real-time stats
- 🛡️ **Bot Protection**: Advanced rate limiting and pattern detection
  - No CAPTCHA required - intelligent detection
  - Sequential RA pattern blocking
  - User-friendly error messages
- 🎉 **Easter Eggs**: Fun bouncing animations for special RA numbers
- ✨ Added FeedFill feature with Chrome extension integration
- 🎨 Added Main Campus (MC) venue map image support
- ⚡ Performance optimizations: session caching and request deduplication
- 📱 Enhanced mobile responsiveness with optimized font sizes
- 🎯 Admin portal with real-time analytics and pagination
- 📊 Latest ID tracking for accurate search counts
- 🔤 Proper case formatting for all student names
- 🎨 Improved room name formatting (removes TP-2 prefix)
- 📱 Mobile-optimized admin table with horizontal scrolling
- 🔄 Auto-refresh functionality for admin dashboard

## 📝 License

Private project - All rights reserved

---

*PS — came into existence on 12th Nov :) since ClassPro and Etc. were unreliable manytimes :(*
