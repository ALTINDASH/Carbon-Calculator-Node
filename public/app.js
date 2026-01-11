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
const swapBtn = document.getElementById('swap-btn');

// Initialize Google Maps
function initMap() {
    console.log('Initializing map...');
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 52.2297, lng: 21.0122 }, // Warsaw, Poland coordinates
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

// Vehicle emission factors (in kg CO2 per mile)
// Sources:
// 1. EPA's Greenhouse Gas Emissions from a Typical Passenger Vehicle (2023)
// 2. European Environment Agency's CO2 emission factors for transport (2023)
// 3. International Energy Agency's Global EV Outlook (2023)
const VEHICLE_EMISSIONS = {
    large_gasoline: 0.404,  // Large SUV/Pickup (15-20 MPG)
    medium_gasoline: 0.269, // Mid-size Sedan (25-30 MPG)
    small_gasoline: 0.179,  // Compact Car (35-40 MPG)
    diesel: 0.231,         // Modern Diesel Car
    electric: 0.089,       // Based on average European grid emissions
    motorcycle: 0.135      // Average Motorcycle
};

// Additional information about each vehicle type
const VEHICLE_INFO = {
    large_gasoline: {
        name: 'Large Gasoline Car',
        description: 'Large SUVs and pickup trucks (15-20 MPG)',
        impact: 'Highest carbon emissions among personal vehicles',
        tips: 'Consider carpooling or using public transport for daily commutes'
    },
    medium_gasoline: {
        name: 'Medium Gasoline Car',
        description: 'Mid-size sedans and crossovers (25-30 MPG)',
        impact: 'Moderate carbon emissions',
        tips: 'Regular maintenance and proper tire inflation can improve fuel efficiency'
    },
    small_gasoline: {
        name: 'Small Gasoline Car',
        description: 'Compact and subcompact cars (35-40 MPG)',
        impact: 'Lower carbon emissions for gasoline vehicles',
        tips: 'Efficient for city driving and short commutes'
    },
    diesel: {
        name: 'Diesel Car',
        description: 'Modern diesel vehicles (35-40 MPG)',
        impact: 'Lower CO2 but higher NOx emissions',
        tips: 'More efficient for long-distance travel'
    },
    electric: {
        name: 'Electric Car',
        description: 'Battery Electric Vehicles (BEVs)',
        impact: 'Lowest carbon emissions when charged with renewable energy',
        tips: 'Charging during off-peak hours can reduce grid emissions'
    },
    motorcycle: {
        name: 'Motorcycle',
        description: 'Standard motorcycles (60-70 MPG)',
        impact: 'Lower carbon emissions but higher safety risks',
        tips: 'Most efficient for single-person travel'
    }
};

// Calculate carbon footprint
function calculateCarbonFootprint(distance, vehicleType) {
    const emissionFactor = VEHICLE_EMISSIONS[vehicleType];
    const carbonFootprint = distance * emissionFactor;
    
    // Add environmental impact message
    const impactMessage = getEnvironmentalImpactMessage(carbonFootprint, vehicleType);
    
    return {
        carbonFootprint,
        impactMessage
    };
}

// Get environmental impact message
function getEnvironmentalImpactMessage(carbonFootprint, vehicleType) {
    const info = VEHICLE_INFO[vehicleType];
    const treesNeeded = Math.ceil(carbonFootprint / 48); // One tree absorbs about 48 pounds of CO2 per year
    
    return {
        vehicleInfo: info,
        treesNeeded,
        message: `This trip's carbon footprint is equivalent to what ${treesNeeded} tree(s) would absorb in a year.`
    };
}

let carbonChart;

// Initialize the chart
function initChart() {
    const canvas = document.getElementById('carbonChart');
    if (!canvas) {
        console.warn('Chart canvas not found, skipping chart initialization');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    carbonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Carbon Footprint (kg CO2)',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Carbon Footprint (kg CO2)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Daily Carbon Footprint'
                }
            }
        }
    });
}

// Update chart with new data
function updateChart(calculations) {
    // Ensure chart is initialized
    if (!carbonChart) {
        initChart();
        // If chart still couldn't be initialized, return early
        if (!carbonChart) {
            console.warn('Chart not available, skipping chart update');
            return;
        }
    }
    
    // Group calculations by date
    const dailyData = {};
    calculations.forEach(calc => {
        const date = calc.timestamp.toDate().toLocaleDateString();
        if (!dailyData[date]) {
            dailyData[date] = 0;
        }
        dailyData[date] += calc.carbonFootprint;
    });

    // Sort dates
    const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
    
    // Update chart data
    carbonChart.data.labels = sortedDates;
    carbonChart.data.datasets[0].data = sortedDates.map(date => dailyData[date]);
    carbonChart.update();
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
            snapshot = await db.collection('calculations')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(30)
                .get();
        } catch (indexError) {
            if (indexError.code === 'failed-precondition') {
                console.log('Index not ready, falling back to unordered query');
                snapshot = await db.collection('calculations')
                    .where('userId', '==', user.uid)
                    .limit(30)
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

        calculations.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

        // Update the chart with the calculations
        updateChart(calculations);

        calculations.forEach(data => {
            console.log('History item:', data);
            const div = document.createElement('div');
            div.className = 'history-item';
            
            // Get vehicle info with fallback for older calculations
            const vehicleInfo = VEHICLE_INFO[data.vehicleType] || {
                name: data.vehicleType || 'Unknown Vehicle',
                description: 'Vehicle information not available',
                impact: 'Impact information not available',
                tips: 'No specific tips available'
            };
            
            // Create impact message with fallback
            const impactMessage = data.impactMessage || 
                `Carbon Footprint: ${data.carbonFootprint.toFixed(2)} kg CO2`;
            
            div.innerHTML = `
                <p>From: ${data.start}</p>
                <p>To: ${data.destination}</p>
                <p>Vehicle: ${vehicleInfo.name}</p>
                <p>Description: ${vehicleInfo.description}</p>
                <p>Distance: ${data.distance.toFixed(2)} miles</p>
                <p>Carbon Footprint: ${data.carbonFootprint.toFixed(2)} kg CO2</p>
                <p>Environmental Impact: ${impactMessage}</p>
                <p>Date: ${data.timestamp.toDate().toLocaleDateString()}</p>
                <button class="delete-btn" data-id="${data.id}">Delete</button>
            `;
            historyList.appendChild(div);
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (confirm('Are you sure you want to delete this calculation?')) {
                    try {
                        await db.collection('calculations').doc(id).delete();
                        await loadHistory();
                    } catch (error) {
                        console.error('Error deleting calculation:', error);
                        alert('Error deleting calculation: ' + error.message);
                    }
                }
            });
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
    const vehicleType = document.getElementById('vehicle-type').value;

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
            const { carbonFootprint, impactMessage } = calculateCarbonFootprint(distanceInMiles, vehicleType);

            document.getElementById('distance-result').textContent = 
                `Distance: ${distanceInMiles.toFixed(2)} miles`;
            document.getElementById('carbon-result').innerHTML = 
                `Carbon Footprint: ${carbonFootprint.toFixed(2)} kg CO2<br>
                <div class="impact-info">
                    <p>${impactMessage.message}</p>
                    <p class="vehicle-tips">${impactMessage.vehicleInfo.tips}</p>
                </div>`;

            const user = auth.currentUser;
            if (user) {
                await saveCalculation(user.uid, {
                    start,
                    destination,
                    distance: distanceInMiles,
                    carbonFootprint,
                    vehicleType,
                    impactMessage: impactMessage.message,
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
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
        console.log('User logged in:', user.uid);
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userEmail.textContent = user.email;
        loadHistory();
    } else {
        console.log('User logged out');
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        userEmail.textContent = '';
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

// Swap start and destination points
swapBtn.addEventListener('click', () => {
    const startValue = startInput.value;
    const destValue = destInput.value;
    
    // Swap the values
    startInput.value = destValue;
    destInput.value = startValue;
    
    // If there's a current route, recalculate it
    if (startValue && destValue) {
        calculateRoute();
    }
});

// Initialize map
initMap();

// Initialize chart when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initChart();
}); 