# TRANS-IT: Product Requirements Document (PRD)

## Executive Summary

**Project Name:** TRANS-IT  
**Version:** 1.0  
**Last Updated:** February 9, 2026  
**Document Owner:** Development Team

### Overview
TRANS-IT is a comprehensive bus transportation management system designed for educational institutions. The platform provides real-time bus tracking, student management, driver coordination, and administrative oversight through three distinct panels: Student Panel, Driver Panel, and Admin Panel.

### Vision
To create a seamless, safe, and efficient transportation experience for students, drivers, and administrators by leveraging real-time GPS tracking, automated notifications, and comprehensive management tools.

### Target Users
- **Students:** College/university students who use campus bus services
- **Drivers:** Bus drivers operating campus routes
- **Administrators:** Transportation department staff managing the fleet

---

## 1. STUDENT PANEL

### 1.1 Overview
The Student Panel is a mobile-first web application that allows students to track their buses in real-time, manage their profiles, and interact with the transportation system.

### 1.2 Core Features

#### 1.2.1 User Authentication
- **Sign In/Sign Up**
  - Email and password authentication via Firebase
  - Secure session management
  - Password reset functionality
  - Auto-redirect to dashboard upon successful login

#### 1.2.2 Student Registration & Profile Management
- **Initial Registration Form**
  - Full Name (mandatory)
  - Email (auto-populated from auth)
  - Department (mandatory)
  - Year (1st, 2nd, 3rd, 4th) (mandatory)
  - Bus Number selection (mandatory)
  - Stop Name selection - dynamically populated based on selected bus (mandatory)
  - Phone Number (mandatory)
  - Parent's Phone Number (mandatory)
  - Full Address (mandatory)
  
- **Profile Editing**
  - "Edit Registration Details" button in profile modal
  - Pre-filled form with existing data
  - All fields editable and re-validated
  - Update confirmation
  - Display name update capability

#### 1.2.3 Real-Time Bus Tracking
- **Bus Search & Selection**
  - Dropdown selection of bus numbers (101-124)
  - Dynamic boarding point selection based on chosen bus
  - Recent routes quick access
  - Favorite bus saving

- **Live Map View**
  - Real-time bus location display using Leaflet maps
  - Student's current location marker
  - Selected boarding point marker
  - Previous stops visualization
  - Route path display
  - Smooth marker animations
  - Auto-centering on bus location

- **Bus Information Display**
  - Current speed (analog speedometer)
  - ETA to selected boarding point
  - Distance to boarding point
  - Driver name and contact
  - Bus capacity and occupancy
  - Last update timestamp
  - Connection status indicator

#### 1.2.4 QR Code Boarding System
- **QR Scanner**
  - Camera-based QR code scanning
  - Bus number validation
  - Duplicate scan prevention (24-hour window)
  - Boarding confirmation
  - Parent notification via SMS (simulated)
  - Boarding record creation in Firestore

- **Boarding History**
  - View past boarding records
  - Date and time stamps
  - Bus number tracking

#### 1.2.5 Travel History & Attendance
- **Attendance Page**
  - Calendar view of travel history
  - Date-wise boarding records
  - Bus number and time details
  - Monthly/weekly summaries
  - Export capability

#### 1.2.6 Route Information
- **Route Details Modal**
  - Complete stop list for selected bus
  - Scheduled arrival times per stop
  - Route map visualization
  - Stop-wise distance information

#### 1.2.7 Feedback & Support System
- **Submit Feedback**
  - Bus-specific feedback
  - Star rating (1-5)
  - Text comments
  - Anonymous submission option
  - Timestamp tracking

- **Query/Support Tickets**
  - Bus-related query submission
  - Issue description
  - Status tracking (noted, resolved)
  - Admin response viewing

#### 1.2.8 User Interface Features
- **Dark/Light Mode Toggle**
  - System-wide theme switching
  - Persistent preference storage
  - Smooth transitions

- **Responsive Design**
  - Mobile-first approach
  - Tablet and desktop compatibility
  - Touch-optimized controls

- **Animated UI Elements**
  - Framer Motion animations
  - Smooth page transitions
  - Interactive micro-animations
  - Background gradient blobs

### 1.3 Technical Specifications

#### 1.3.1 Technology Stack
- **Frontend:** Next.js, React
- **Styling:** Vanilla CSS with custom animations
- **Maps:** Leaflet.js with OpenStreetMap
- **QR Scanning:** html5-qrcode library
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Backend:** Firebase (Firestore, Authentication)

#### 1.3.2 Data Models
```javascript
// User Profile
{
  uid: string,
  email: string,
  name: string,
  displayName: string,
  department: string,
  year: string,
  busNumber: number,
  stopName: string,
  phoneNumber: string,
  parentPhoneNumber: string,
  address: string,
  role: 'student',
  updatedAt: timestamp
}

// Boarding Record
{
  busNumber: number,
  studentId: string,
  studentName: string,
  status: 'Boarded',
  scannedAt: timestamp,
  parentNotified: boolean
}

// Feedback
{
  studentId: string,
  studentName: string,
  busNumber: number,
  rating: number (1-5),
  comment: string,
  createdAt: timestamp
}

// Query
{
  studentId: string,
  studentName: string,
  studentEmail: string,
  busNumber: string,
  query: string,
  status: 'noted' | 'resolved',
  createdAt: timestamp
}
```

### 1.4 User Flows

#### 1.4.1 First-Time User Flow
1. Sign up with email/password
2. Redirected to dashboard
3. Registration modal appears (mandatory)
4. Fill all required fields
5. Submit registration
6. Access full dashboard features

#### 1.4.2 Bus Tracking Flow
1. Select bus number from dropdown
2. Choose boarding point
3. Click "Start Tracking"
4. View real-time bus location on map
5. Monitor ETA and distance
6. Receive updates every few seconds

#### 1.4.3 Boarding Flow
1. Navigate to "Scan QR" page
2. Grant camera permissions
3. Scan bus QR code
4. System validates bus number
5. Check for duplicate scans (24h)
6. Confirm boarding
7. Parent receives SMS notification
8. Record saved to Firestore

---

## 2. DRIVER PANEL

### 2.1 Overview
The Driver Panel is a web application designed for bus drivers to manage their trips, track routes, report delays, and communicate with the system.

### 2.2 Core Features

#### 2.2.1 User Authentication
- **Driver Login**
  - Email/password authentication
  - Secure session management
  - Role-based access control (driver role)

#### 2.2.2 Trip Management
- **Start Trip**
  - Bus number selection
  - Route selection
  - Driver name input
  - Trip initialization
  - Real-time tracking activation

- **End Trip**
  - Trip completion confirmation
  - Automatic log creation
  - Status update to 'completed'
  - Tracking deactivation

- **Active Trip Dashboard**
  - Current trip status display
  - Elapsed time counter
  - Route information
  - Quick actions (End Trip, Report Delay)

#### 2.2.3 Real-Time GPS Tracking
- **Location Broadcasting**
  - Continuous GPS position updates
  - Speed calculation and transmission
  - Heading/bearing tracking
  - Update frequency: every 3-5 seconds
  - Firestore real-time sync

- **Tracking Data**
  - Latitude/Longitude coordinates
  - Speed (km/h)
  - Heading (degrees)
  - Last update timestamp
  - Active status flag

#### 2.2.4 Delay Reporting System
- **Report Delay**
  - Quick delay reason selection
  - Custom message input
  - Automatic admin notification
  - Timestamp recording
  - Status tracking

- **Delay Reasons**
  - Traffic congestion
  - Vehicle breakdown
  - Weather conditions
  - Road construction
  - Other (custom message)

#### 2.2.5 Route Navigation
- **Route Display**
  - Interactive map with route overlay
  - Stop markers
  - Current position indicator
  - Destination highlighting
  - Turn-by-turn guidance (optional)

#### 2.2.6 Speed Monitoring
- **Analog Speedometer**
  - Real-time speed display
  - Visual gauge (0-120 km/h)
  - Color-coded speed zones
  - Speed limit warnings

#### 2.2.7 Communication Features
- **View Announcements**
  - Admin announcements display
  - Date and time stamps
  - Priority indicators
  - Read/unread status

### 2.3 Technical Specifications

#### 2.3.1 Technology Stack
- **Frontend:** Next.js, React
- **Maps:** Leaflet.js
- **Real-time Updates:** Firebase Firestore listeners
- **Geolocation:** Browser Geolocation API
- **UI Components:** Custom React components

#### 2.3.2 Data Models
```javascript
// Trip Log
{
  busNumber: number,
  driverName: string,
  route: string,
  startTime: timestamp,
  endTime: timestamp | null,
  status: 'active' | 'completed',
  date: string
}

// Tracking Data
{
  busNumber: number,
  lat: number,
  lng: number,
  speed: number,
  heading: number,
  active: boolean,
  lastUpdated: timestamp,
  driverName: string
}

// Delay Report (Admin Notification)
{
  type: 'DELAY_REPORT',
  busNumber: number,
  driverName: string,
  message: string,
  timestamp: timestamp,
  status: 'new' | 'acknowledged'
}
```

### 2.4 User Flows

#### 2.4.1 Start Trip Flow
1. Driver logs in
2. Clicks "Start Trip"
3. Selects bus number
4. Selects route
5. Enters driver name
6. Confirms trip start
7. GPS tracking begins
8. Trip status changes to 'active'

#### 2.4.2 During Trip Flow
1. Continuous GPS position updates
2. Speed monitoring
3. Route following
4. Optional delay reporting
5. View announcements
6. Monitor trip duration

#### 2.4.3 Report Delay Flow
1. Click "Report Delay" button
2. Select delay reason or enter custom message
3. Submit report
4. Notification sent to admin panel
5. Confirmation displayed
6. Continue trip

---

## 3. ADMIN PANEL

### 3.1 Overview
The Admin Panel is a comprehensive management dashboard for transportation administrators to oversee the entire bus system, manage users, monitor trips, and handle communications.

### 3.2 Core Features

#### 3.2.1 User Authentication
- **Admin Login**
  - Dedicated admin login page (/admin-login)
  - Email/password authentication
  - Role-based access control (admin role)
  - Secure session management

#### 3.2.2 Dashboard Overview
- **Statistics Cards**
  - Total trips today
  - Active buses count
  - Total students registered
  - Pending queries count
  - Real-time updates

- **Quick Actions**
  - Post announcement
  - View live map
  - Check delay reports
  - Access user management

#### 3.2.3 Trip Management & History
- **Trip Logs**
  - Comprehensive trip history table
  - Date-wise filtering
  - Bus number filtering
  - Driver name display
  - Start/End time tracking
  - Trip status (active/completed)
  - Export functionality

- **Date Filter**
  - Calendar date picker
  - Quick date selection
  - Clear filter option
  - Real-time table updates

#### 3.2.4 User Management (Registered Students)
- **Student List**
  - Complete student registry
  - Real-time Firestore sync
  - Student count display
  - Comprehensive data table

- **Student Information Display**
  - Full Name
  - Email address
  - Bus Number (with badge)
  - Stop Name
  - Department
  - Year
  - Phone Number
  - Parent's Phone Number

- **Search & Filter**
  - Search by name, email, bus number, department, or stop
  - Real-time search results
  - Case-insensitive matching

#### 3.2.5 Driver Management
- **Driver List**
  - All registered drivers
  - Driver details (name, phone, bus assignment)
  - Add new driver
  - Edit driver information
  - Delete driver
  - Assign/unassign buses

- **Driver Actions**
  - Create driver profile
  - Update driver details
  - Manage bus assignments
  - View driver trip history

#### 3.2.6 Bus/Route Management
- **Route Configuration**
  - Create new routes
  - Edit existing routes
  - Delete routes
  - Stop management (add/remove/reorder)
  - Time schedule configuration

- **Bus Management**
  - Bus list (101-124)
  - Maintenance mode toggle
  - Bus status tracking
  - Capacity management
  - Assignment to drivers

- **Route Details**
  - Route name
  - Stop list with times
  - Total stops count
  - Route duration
  - Active/inactive status

#### 3.2.7 Live Fleet Tracking
- **Live Map View**
  - Real-time positions of all active buses
  - Bus markers with numbers
  - Movement animations
  - Status indicators (active/inactive/stale)
  - Auto-refresh every few seconds
  - Stale data detection (>5 minutes)

- **Fleet Information**
  - Active buses count
  - Bus speeds
  - Last update times
  - Driver names
  - Route assignments

#### 3.2.8 Announcements System
- **Create Announcements**
  - Title and message input
  - Target audience selection (All, Students, Drivers)
  - Priority levels
  - Scheduled posting
  - Immediate broadcast

- **Announcement Management**
  - View all announcements
  - Edit announcements
  - Delete announcements
  - Announcement history
  - Delivery status tracking

- **Announcement Display**
  - Chronological listing
  - Date/time stamps
  - Author information
  - Read counts (future enhancement)

#### 3.2.9 Feedback Management
- **View Feedback**
  - All student feedback
  - Bus-wise filtering
  - Rating display (star visualization)
  - Comment viewing
  - Student information
  - Timestamp tracking

- **Feedback Analytics**
  - Average ratings per bus
  - Trend analysis
  - Common issues identification
  - Response tracking

#### 3.2.10 Query/Support Management
- **Query List**
  - All student queries
  - Status indicators (noted/resolved)
  - Bus number association
  - Student contact information
  - Query description
  - Timestamp

- **Query Actions**
  - Mark as resolved
  - Add admin response
  - Priority assignment
  - Escalation options

#### 3.2.11 Delay Report Management
- **Active Issues Section**
  - Unacknowledged delay reports
  - Red pulsing indicator
  - Count of active issues
  - Visual priority highlighting
  - "New Report" badges

- **Delay Report Details**
  - Bus number
  - Driver name
  - Delay message/reason
  - Report timestamp
  - Status (new/acknowledged)

- **Acknowledge Action**
  - "Acknowledge" button for each active report
  - Status update to 'acknowledged'
  - Move to history section
  - Firestore sync

- **History Section**
  - All acknowledged reports
  - Grey indicators
  - "Acknowledged" badges
  - Chronological listing
  - Searchable archive

#### 3.2.12 SOS/Emergency Alerts
- **SOS Alert Display**
  - Emergency alerts from drivers
  - Location information
  - Alert type
  - Timestamp
  - Priority indicators

- **Alert Management**
  - Acknowledge alerts
  - Dispatch assistance
  - Contact driver
  - Log resolution

### 3.3 Technical Specifications

#### 3.3.1 Technology Stack
- **Frontend:** Next.js, React
- **Styling:** Vanilla CSS with custom styling
- **Maps:** Custom AdminMap component with Leaflet
- **Real-time Data:** Firebase Firestore listeners
- **Animations:** Framer Motion
- **Icons:** Lucide React

#### 3.3.2 Data Models
```javascript
// Admin Notification (Delay Report)
{
  id: string,
  type: 'DELAY_REPORT',
  busNumber: number,
  driverName: string,
  message: string,
  timestamp: timestamp,
  status: 'new' | 'acknowledged'
}

// Announcement
{
  id: string,
  title: string,
  message: string,
  createdAt: timestamp,
  author: string,
  target: 'all' | 'students' | 'drivers'
}

// Driver
{
  id: string,
  name: string,
  phone: string,
  busAssignment: number | null,
  status: 'active' | 'inactive'
}

// Route
{
  id: string,
  name: string,
  busNumber: number,
  stops: [
    {
      name: string,
      time: string,
      lat: number,
      lng: number
    }
  ],
  active: boolean
}
```

### 3.4 User Flows

#### 3.4.1 Delay Report Management Flow
1. Admin logs in to panel
2. Navigates to "Delays" tab
3. Views "Active Issues" section
4. Reviews delay report details
5. Clicks "Acknowledge" button
6. Report moves to "History" section
7. Status updated in Firestore
8. Visual indicators update

#### 3.4.2 Student Management Flow
1. Navigate to "Users" tab
2. View registered students list
3. Use search to find specific student
4. Review student details
5. Export data if needed
6. Monitor registration trends

#### 3.4.3 Announcement Flow
1. Navigate to "Announcements" tab
2. Click "Post New Announcement"
3. Enter title and message
4. Select target audience
5. Submit announcement
6. Announcement broadcasts to relevant users
7. Appears in driver/student panels

---

## 4. CROSS-PANEL FEATURES

### 4.1 Real-Time Synchronization
- **Firestore Listeners**
  - All panels use real-time Firestore listeners
  - Automatic UI updates on data changes
  - No manual refresh required
  - Sub-second latency

### 4.2 Authentication & Authorization
- **Firebase Authentication**
  - Centralized user management
  - Role-based access control
  - Secure session handling
  - Password reset functionality

- **Role Types**
  - Student
  - Driver
  - Admin

### 4.3 Notification System
- **Parent Notifications**
  - SMS notifications on student boarding
  - Parent phone number from student profile
  - Simulated SMS (production: Twilio integration)

- **Admin Notifications**
  - Delay reports from drivers
  - SOS alerts
  - System notifications

### 4.4 Data Persistence
- **Firestore Collections**
  - users (student profiles)
  - drivers
  - routes
  - tracking (real-time GPS)
  - trip_logs
  - boardings
  - feedback
  - queries
  - announcements
  - admin_notifications
  - sos_alerts

---

## 5. NON-FUNCTIONAL REQUIREMENTS

### 5.1 Performance
- **Load Time**
  - Initial page load: <3 seconds
  - Map rendering: <2 seconds
  - Real-time updates: <1 second latency

- **Scalability**
  - Support 1000+ concurrent students
  - Handle 50+ active buses
  - Process 500+ daily boardings

### 5.2 Security
- **Authentication**
  - Secure password hashing (Firebase)
  - Session timeout: 24 hours
  - HTTPS enforcement

- **Data Protection**
  - Firestore security rules
  - Role-based data access
  - PII encryption in transit

### 5.3 Reliability
- **Uptime**
  - Target: 99.5% uptime
  - Graceful degradation on network issues
  - Offline capability (future enhancement)

- **Data Integrity**
  - Transaction-based updates
  - Duplicate prevention mechanisms
  - Data validation on all inputs

### 5.4 Usability
- **Accessibility**
  - Mobile-responsive design
  - Touch-optimized controls
  - Clear visual hierarchy
  - Intuitive navigation

- **Browser Support**
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)

### 5.5 Compatibility
- **Devices**
  - iOS devices (iPhone, iPad)
  - Android devices
  - Desktop browsers
  - Tablets

---

## 6. FUTURE ENHANCEMENTS

### 6.1 Student Panel
- Push notifications for bus arrival
- Offline mode with cached data
- Multi-language support
- In-app chat with driver
- Ride sharing coordination
- Payment integration for bus fees

### 6.2 Driver Panel
- Voice-guided navigation
- Incident reporting with photos
- Fuel consumption tracking
- Maintenance reminders
- Digital logbook
- Emergency contact quick dial

### 6.3 Admin Panel
- Advanced analytics dashboard
- Predictive maintenance alerts
- Route optimization algorithms
- Automated report generation
- Integration with student information system
- Budget and cost tracking
- Driver performance metrics
- Heatmap of popular routes/stops

### 6.4 System-Wide
- Mobile native apps (iOS/Android)
- AI-powered ETA predictions
- Automated delay notifications
- Integration with campus security
- Weather-based route adjustments
- Carbon footprint tracking

---

## 7. SUCCESS METRICS

### 7.1 Student Engagement
- Daily active users: >70% of registered students
- Average session duration: >5 minutes
- Feature adoption rate: >80% use tracking feature

### 7.2 Operational Efficiency
- On-time performance: >85% of trips
- Delay report response time: <10 minutes
- Query resolution time: <24 hours

### 7.3 User Satisfaction
- Student satisfaction rating: >4.0/5.0
- Driver satisfaction rating: >4.0/5.0
- Support query volume: <5% of daily users

### 7.4 System Performance
- Average page load time: <2 seconds
- GPS update frequency: Every 3-5 seconds
- System uptime: >99%

---

## 8. TECHNICAL ARCHITECTURE

### 8.1 Frontend Architecture
```
TRANS-IT/
├── apps/
│   ├── student/          # Student Panel (Next.js)
│   │   ├── pages/
│   │   │   ├── index.js           # Landing page
│   │   │   ├── dashboard.js       # Main dashboard
│   │   │   ├── scan.js            # QR scanner
│   │   │   ├── attendance.js      # Travel history
│   │   │   └── auth/
│   │   │       └── signin.js      # Student login
│   │   ├── components/
│   │   │   └── Map.js             # Leaflet map component
│   │   └── data/
│   │       └── busRoutes.js       # Route data
│   │
│   └── driver/           # Driver + Admin Panel (Next.js)
│       ├── pages/
│       │   ├── index.js           # Driver landing
│       │   ├── dashboard.js       # Driver dashboard
│       │   ├── admin.js           # Admin panel
│       │   ├── admin-login.js     # Admin login
│       │   └── auth/
│       │       └── signin.js      # Driver login
│       └── components/
│           ├── AdminMap.js        # Fleet tracking map
│           ├── AnalogSpeedometer.js
│           └── SlideButton.js
│
├── firebaseClient.js     # Firebase initialization
└── package.json
```

### 8.2 Backend Architecture (Firebase)
- **Authentication:** Firebase Auth
- **Database:** Cloud Firestore
- **Hosting:** Firebase Hosting (or Vercel)
- **Functions:** Cloud Functions (future)

### 8.3 Data Flow
```
Student App → Firestore → Real-time Listeners → Driver/Admin Panels
Driver App → GPS → Firestore → Real-time Listeners → Student/Admin Panels
Admin Panel → Firestore → Real-time Listeners → Student/Driver Panels
```

---

## 9. DEPLOYMENT & MAINTENANCE

### 9.1 Deployment Strategy
- **Development:** Local development servers
- **Staging:** Vercel preview deployments
- **Production:** Vercel production deployment
- **Database:** Firebase Firestore (production project)

### 9.2 Monitoring
- **Application Monitoring:** Vercel Analytics
- **Error Tracking:** Console logging (future: Sentry)
- **Performance:** Lighthouse CI
- **Database:** Firebase Console

### 9.3 Backup & Recovery
- **Database Backups:** Daily Firestore exports
- **Code Repository:** Git version control
- **Recovery Time Objective (RTO):** <4 hours
- **Recovery Point Objective (RPO):** <24 hours

---

## 10. GLOSSARY

- **ETA:** Estimated Time of Arrival
- **GPS:** Global Positioning System
- **QR Code:** Quick Response Code
- **SOS:** Emergency distress signal
- **PRD:** Product Requirements Document
- **UI/UX:** User Interface/User Experience
- **API:** Application Programming Interface
- **Firestore:** Google Cloud Firestore (NoSQL database)
- **Real-time Listener:** Firestore onSnapshot subscription
- **Stale Data:** GPS data older than 5 minutes

---

## 11. APPENDIX

### 11.1 Bus Route Numbers
- Available buses: 101-124 (24 buses total)
- Each bus has predefined routes with stops
- Routes stored in `busRoutes.js`

### 11.2 User Roles
- **student:** Access to Student Panel only
- **driver:** Access to Driver Panel only
- **admin:** Access to Admin Panel only

### 11.3 Firebase Collections Schema
Refer to Section 3.3.2 and Section 2.3.2 for detailed data models.

### 11.4 Color Scheme
- **Primary:** Blue (#3b82f6, #2563eb)
- **Success:** Green (#10b981)
- **Warning:** Yellow/Orange (#f59e0b)
- **Danger:** Red (#ef4444)
- **Neutral:** Gray scale (#64748b, #94a3b8, #cbd5e1)

---

**Document Version:** 1.0  
**Last Updated:** February 9, 2026  
**Next Review Date:** March 9, 2026

---

*This PRD is a living document and will be updated as the project evolves and new requirements emerge.*
