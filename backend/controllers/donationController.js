const { db } = require('../config/firebaseConfig');

// @desc    Get all active food requests
// @route   GET /api/donations
// @access  Public
const getDonations = async (req, res) => {
    try {
        const requestsRef = db.collection('food_requests');
        // Get created or assigned or picked_up requests
        const snapshot = await requestsRef.where('status', 'in', ['created', 'assigned', 'picked_up']).get();

        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(requests);
    } catch (error) {
        console.error('Error getting food requests:', error);
        res.status(500).json({ message: 'Error fetching food requests' });
    }
};

// @desc    Create a new food request (donation)
// @route   POST /api/donations
// @access  Public
const createDonation = async (req, res) => {
    const {
        orgName,
        donorType,
        foodType,
        location,
        quantity,
        time,
        latitude,
        longitude,
        food_image
    } = req.body;

    if (!orgName || !quantity || !location) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        let lat = parseFloat(latitude);
        let lon = parseFloat(longitude);

        // Fallback geocoding if lat/lon not provided
        if (isNaN(lat) || isNaN(lon)) {
            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
                headers: { 'User-Agent': 'ZeroHungerPlatform/1.0' }
            });
            const geoData = await geoResponse.json();
            if (geoData && geoData.length > 0) {
                lat = parseFloat(geoData[0].lat);
                lon = parseFloat(geoData[0].lon);
            } else {
                lat = 17.3850; // Hyderabad fallback
                lon = 78.4867;
            }
        }

        const newRequest = {
            donor_id: req.user.uid,
            donor_name: orgName,
            donor_type: donorType,
            food_details: `${foodType} - ${quantity} Meals`,
            quantity: quantity,
            pickup_address: location,
            pickup_location: { lat, lng: lon },
            expiry_time: time,
            status: "created",
            food_image: food_image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80',
            created_at: new Date().toISOString(),
            // Legacy support
            foodItem: `${foodType} - ${quantity} Meals`,
            location: location,
            orgName: orgName
        };

        const docRef = await db.collection('food_requests').add(newRequest);

        res.status(201).json({ id: docRef.id, ...newRequest });
    } catch (error) {
        console.error('Error creating food request:', error);
        res.status(500).json({ message: 'Error creating food request' });
    }
};

const getDonorDonations = async (req, res) => {
    try {
        const snapshot = await db.collection('food_requests').where('donor_id', '==', req.user.uid).get();
        const results = [];
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching donor requests:', error);
        res.status(500).json({ message: 'Error fetching your requests' });
    }
};

const getReceiverDonations = async (req, res) => {
    try {
        const snapshot = await db.collection('food_requests').where('receiver_id', '==', req.user.uid).get();
        const results = [];
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching receiver requests:', error);
        res.status(500).json({ message: 'Error fetching your assigned tasks' });
    }
};

module.exports = {
    getDonations,
    createDonation,
    getDonorDonations,
    getReceiverDonations
};
