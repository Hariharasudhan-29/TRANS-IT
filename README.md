# Trans-It Mono-repo

**Trans-It** is a modern, real-time transportation management system designed to streamline campus and transit operations. It features a unified monorepo structure containing dedicated applications for students and drivers, leveraging the power of Next.js and Firebase for a seamless, real-time experience.

## Project Summary

The goal of Trans-It is to digitize and improve the transit experience by providing:
- **Real-time Tracking**: Students can track bus locations on a live map.
- **QR Code Boarding**: A digital ticketing system where students generate unique QR codes and drivers scan them for validation.
- **Efficient Operations**: A dedicated driver interface for route management and passenger verification.

## Tech Stack

- **Monorepo Tooling**: [TurboRepo](https://turbo.build/) for high-performance build system.
- **Framework**: [Next.js 13](https://nextjs.org/) (React 18).
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Realtime Database).
- **Maps**: [Leaflet](https://leafletjs.com/) & `react-leaflet` for interactive maps.
- **QR Technology**: `html5-qrcode` and `react-qr-code` for generating and scanning tickets.
- **Styling**: Shared UI primitives in a dedicated package.

## Project Structure

This project is organized as a monorepo:

- **`apps/student`**: A Progressive Web App (PWA) for students.
    - View live bus locations.
    - Generate QR pass for boarding.
    - View schedules.
- **`apps/driver`**: A web application for transit drivers.
    - Broadcast real-time location.
    - Scan student QR codes for validation.
    - Route navigation assistance.
- **`packages/ui`**: Shared UI component library to ensure design consistency across applications.

## Getting Started

### Prerequisites
- Node.js (Latest LTS recommended)
- `npm` or `pnpm`
- Firebase project credentials

### Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    # or
    pnpm install
    ```

2.  **Run Development Server**:
    Start all applications in parallel using TurboRepo:
    ```bash
    npm run dev
    ```
    - Student App: http://localhost:3001
    - Driver App: http://localhost:3000

3.  **Firebase Setup**:
    - Ensure `firebase-service-account.json` is correctly placed (Note: Rotate credentials for production).
    - Configure client-side Firebase keys in `.env` files for each app.

## Development Notes
- The `firebase-service-account.json` included in the root is for **development purposes only**.
- Add new pages and logic within the respective `apps/` directories.
- Shared logic and components should be placed in `packages/ui` or a new shared package.
