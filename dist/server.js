"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3004;
// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};
// Initialize Firebase
const firebaseApp = (0, app_1.initializeApp)(firebaseConfig);
const db = (0, firestore_1.getFirestore)(firebaseApp);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.set('view engine', 'ejs');
app.set('views', path_1.default.join(__dirname, '../public'));
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
// Routes
app.get('/', (req, res) => {
    res.render('index', {
        GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
        FIREBASE_CONFIG: JSON.stringify(firebaseConfig)
    });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
