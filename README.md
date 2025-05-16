# Carbon Calculator with Google Maps

A web application that calculates carbon footprint based on travel routes using Google Maps integration. The application includes user authentication and history tracking using Firebase.

## Features

- Route calculation using Google Maps
- Carbon footprint estimation
- User authentication with Firebase
- History tracking of calculations
- Autocomplete for location input
- Interactive map display

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Maps API key
- Firebase project credentials

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd calculator_with_node
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```
PORT=3000
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
FIREBASE_PROJECT_ID=your_firebase_project_id_here
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
FIREBASE_APP_ID=your_firebase_app_id_here
```

4. Update the Firebase configuration in `public/app.js` with your Firebase project credentials.

5. Build the TypeScript files:
```bash
npm run build
```

## Running the Application

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. Sign up or log in to your account
2. Enter your starting point and destination
3. Click "Calculate Carbon Footprint"
4. View the route on the map and see the calculated carbon footprint
5. Check your calculation history in the history section

## Carbon Footprint Calculation

The carbon footprint is calculated using the following formula:
- Average car CO2 emissions: 404 grams per mile
- Total CO2 = Distance (miles) × 0.404 kg/mile

## Technologies Used

- Node.js
- TypeScript
- Express.js
- Firebase (Authentication & Firestore)
- Google Maps API
- HTML/CSS/JavaScript 