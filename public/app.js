// Initialize Firebase with the config from the template
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable Firestore offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.log('The current browser does not support persistence.');
        }
    });

// Google Maps variables
let map;
let directionsService;
let directionsRenderer;
let autocompleteStart;
let autocompleteEnd;

// DOM Elements
const startInput = document.getElementById('start-point');
const destInput = document.getElementById('destination');
const calculateBtn = document.getElementById('calculate-btn');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const historyList = document.getElementById('history-list');
const authModal = document.getElementById('auth-modal');
const modalTitle = document.getElementById('modal-title');
const authForm = document.getElementById('auth-form');
const closeBtn = document.querySelector('.close');

// Initialize Google Maps
function initMap() {
    console.log('Initializing map...');
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 41.0082, lng: 28.9784 }, // Istanbul coordinates as default
        zoom: 10
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Initialize autocomplete
    autocompleteStart = new google.maps.places.Autocomplete(startInput);
    autocompleteEnd = new google.maps.places.Autocomplete(destInput);
}

// Modal functions
function openModal(type) {
    modalTitle.textContent = type === 'login' ? 'Login' : 'Sign Up';
    authModal.style.display = 'block';
    authForm.dataset.type = type;
}

function closeModal() {
    authModal.style.display = 'none';
    authForm.reset();
}

// Firebase Authentication
loginBtn.addEventListener('click', () => openModal('login'));
signupBtn.addEventListener('click', () => openModal('signup'));
closeBtn.addEventListener('click', closeModal);

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const type = authForm.dataset.type;

    try {
        if (type === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
        }
        closeModal();
    } catch (error) {
        alert(error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Calculate carbon footprint
function calculateCarbonFootprint(distance) {
    // Average car CO2 emissions: 404 grams per mile
    const CO2_PER_MILE = 0.404;
    return distance * CO2_PER_MILE;
}

// Load calculation history
async function loadHistory() {
    const user = auth.currentUser;
    if (!user) {
        historyList.innerHTML = '<p>Please log in to view history</p>';
        return;
    }

    try {
        console.log('Loading history for user:', user.uid);
        let snapshot;
        
        try {
            // Try to get ordered results
            snapshot = await db.collection('calculations')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
        } catch (indexError) {
            if (indexError.code === 'failed-precondition') {
                // If index is not ready, fall back to unordered results
                console.log('Index not ready, falling back to unordered query');
                snapshot = await db.collection('calculations')
                    .where('userId', '==', user.uid)
                    .limit(10)
                    .get();
            } else {
                throw indexError;
            }
        }

        if (snapshot.empty) {
            console.log('No history found');
            historyList.innerHTML = '<p>No calculations yet</p>';
            return;
        }

        historyList.innerHTML = '';
        let calculations = [];
        
        snapshot.forEach(doc => {
            calculations.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Sort manually if we're using the fallback query
        calculations.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

        calculations.forEach(data => {
            console.log('History item:', data);
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <p>From: ${data.start}</p>
                <p>To: ${data.destination}</p>
                <p>Distance: ${data.distance.toFixed(2)} miles</p>
                <p>Carbon Footprint: ${data.carbonFootprint.toFixed(2)} kg CO2</p>
                <p>Date: ${data.timestamp.toDate().toLocaleDateString()}</p>
            `;
            historyList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading history:', error);
        if (error.code === 'failed-precondition') {
            historyList.innerHTML = '<p>Setting up database indexes... Please wait a few minutes and try again.</p>';
        } else {
            historyList.innerHTML = '<p>Error loading history: ' + error.message + '</p>';
        }
    }
}

// Save calculation to Firebase
async function saveCalculation(userId, data) {
    try {
        console.log('Saving calculation for user:', userId, data);
        const docRef = await db.collection('calculations').add({
            userId,
            ...data
        });
        console.log('Calculation saved with ID:', docRef.id);
        await loadHistory(); // Reload history after saving
    } catch (error) {
        console.error('Error saving calculation:', error);
        alert('Error saving calculation: ' + error.message);
    }
}

// Calculate route and carbon footprint
async function calculateRoute() {
    if (!auth.currentUser) {
        alert('Please log in to save calculations');
        return;
    }

    const start = startInput.value;
    const destination = destInput.value;

    if (!start || !destination) {
        alert('Please enter both start and destination points');
        return;
    }

    const request = {
        origin: start,
        destination: destination,
        travelMode: 'DRIVING'
    };

    directionsService.route(request, async (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            const route = result.routes[0];
            const distanceInMiles = route.legs[0].distance.value / 1609.34;
            const carbonFootprint = calculateCarbonFootprint(distanceInMiles);

            document.getElementById('distance-result').textContent = 
                `Distance: ${distanceInMiles.toFixed(2)} miles`;
            document.getElementById('carbon-result').textContent = 
                `Carbon Footprint: ${carbonFootprint.toFixed(2)} kg CO2`;

            const user = auth.currentUser;
            if (user) {
                await saveCalculation(user.uid, {
                    start,
                    destination,
                    distance: distanceInMiles,
                    carbonFootprint,
                    timestamp: firebase.firestore.Timestamp.now()
                });
            }
        } else {
            alert('Could not calculate route. Please check your inputs.');
        }
    });
}

// Auth state observer
auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User logged in:', user.uid);
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        loadHistory();
    } else {
        console.log('User logged out');
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        historyList.innerHTML = '<p>Please log in to view history</p>';
    }
});

// Event listeners
calculateBtn.addEventListener('click', calculateRoute);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeModal();
    }
});

// Initialize map
initMap(); 