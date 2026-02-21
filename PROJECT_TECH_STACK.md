# TRANS-IT Project - Technical Documentation

This document provides a detailed overview of the technologies, APIs, and key components used in the TRANS-IT project.

## 1. Core Framework & Architecture
*   **Framework**: **Next.js** (React-based framework)
    *   Used for both Student and Driver applications.
    *   Handles server-side rendering (SSR) and static site generation (SSG).
*   **Monorepo Tooling**: **Turbo**
    *   Manages the workspace containing multiple apps (`apps/driver`, `apps/student`).
    *   Enables parallel execution of scripts (`dev`, `build`, `start`).
*   **Language**: **JavaScript** (ES6+)

## 2. Backend & Database
*   **Platform**: **Firebase**
    *   **Authentication**: Used for secure user login/signup (Email/Password, Google Auth).
    *   **Firestore (NoSQL Database)**: Real-time database for storing:
        *   User profiles (`users` collection)
        *   Bus routes and stops (`routes` collection)
        *   Live bus tracking data (`tracking` collection)
        *   Lost & Found items (`lost_found` collection)
        *   Notifications and alerts

## 3. Maps & Navigation (Geolocation)
*   **Map Library**: **Leaflet** & **React-Leaflet**
    *   Used to render interactive maps in both driver and student apps.
*   **Tile Provider**: **OpenStreetMap (OSM)**
    *   Provides the base map layer via `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
*   **Routing API**: **OSRM (Open Source Routing Machine)**
    *   Used to calculate and draw the route path between the bus location and destination.
    *   Endpoint: `https://router.project-osrm.org/route/v1/driving/...`
*   **Geolocation API**: **Browser Navigator API**
    *   `navigator.geolocation.watchPosition`: Used in the **Driver App** to get real-time GPS coordinates, speed, and heading.

## 4. Key UI Components

### 🏎️ Speedometer (Driver App)
*   **Implementation**: **Custom React Component** (`AnalogSpeedometer.js`)
*   **Technology**: Pure **SVG** and **CSS Transforms**.
*   **Logic**:
    *   Takes `speed` as a prop.
    *   Calculates rotation angle based on a max speed of 140 km/h.
    *   Uses CSS transitions (`transition: transform 0.5s`) for smooth needle movement.
    *   Displays digital readout alongside the analog needle.

### 📱 QR Scanning
*   **Libraries**:
    *   `html5-qrcode`: Used in the **Student App** for scanning bus QR codes.
    *   `react-qr-scanner`: Used in the **Driver App** (if applicable setup).
    *   `react-qr-code`: Used to **generate** QR codes for students/buses.

### 🎨 UI & Animations
*   **Styling**:
    *   **CSS Modules / Global CSS**: Custom stylesheets (`mobile-enhanced.css`, `responsive.css`) for responsive design.
    *   **Font**: Google Fonts ("Outfit", "Inter").
*   **Animations**: **Framer Motion**
    *   Used for:
        *   Page transitions.
        *   Modal popups (slide-up, fade-in).
        *   Interactive button taps (`whileTap`).
        *   Live notifications.
*   **Icons**: **Lucide React**
    *   Provides consistent, lightweight SVG icons (e.g., `Bus`, `MapPin`, `User`, `Bell`).

## 5. Navigation & Routing
*   **Library**: **Next.js Router** (`next/router`)
    *   `useRouter` hook used for client-side navigation between pages (e.g., Dashboard -> Scan -> Profile).
    *   Supports query parameters for passing data (e.g., `?bus=101`).

## 6. Real-Time Features
*   **Bus Tracking**:
    *   **Driver App**: Pushes GPS updates to Firestore `tracking/{busNumber}` every few seconds (throttled).
    *   **Student App**: Listens to Firestore `tracking/{busNumber}` in real-time (`onSnapshot`) to update the bus marker on the map.
*   **Notifications**:
    *   Real-time listeners on `admin_notifications` and `delays` collections to trigger alerts using Framer Motion.

## Summary of Dependencies
### Student App (`apps/student/package.json`)
*   `firebase`
*   `framer-motion`
*   `html5-qrcode`
*   `leaflet`, `react-leaflet`
*   `lucide-react`
*   `react-qr-code`

### Driver App (`apps/driver/package.json`)
*   `firebase`
*   `framer-motion`
*   `leaflet`, `react-leaflet`
*   `react-qr-code`
*   `react-qr-scanner`
