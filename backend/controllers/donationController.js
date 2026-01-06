const { db } = require('../config/firebaseConfig');
const fetch = require('node-fetch'); // IMPORTANT for Node.js

// @desc    Get all active food requests
// @route   GET /api/donations
// @access  Public
const getDonations = async (req, res) => {
    try {
        const requestsRef = db.collection('food_requests');
        const snapshot = await requestsRef
            .where('status', 'in', ['created', 'assigned', 'picked_up'])
            .get();

        const requests = [];
        snapshot.forEach(doc => {
            requests.push({ id: doc.id, ...doc.data() });
        });

        return res.status(200).json(requests);
    } catch (error) {
        console.error('Error getting food requests:', error);
        return res.status(500).json({ message: 'Error fetching food requests' });
    }
};

// @desc    Create a new food request (donation)
// @route   POST /api/donations
// @access  Public
const createDonation = async (req, res) => {
    // 1. Log entry
    console.log('🏁 [createDonation] STARTED');
    console.log('📥 [createDonation] Raw Body:', req.body);

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

    // 2. Log validated fields
    if (!orgName || !quantity || !location) {
        console.warn('⚠️ [createDonation] Validation Failed: Missing required fields');
        return res.status(400).json({
            message: 'Please provide all required fields'
        });
    }
    console.log('✅ [createDonation] Validation Passed');

    try {
        // 3. Log Lat/Long parsing
        let lat = latitude ? parseFloat(latitude) : null;
        let lon = longitude ? parseFloat(longitude) : null;
        console.log(`📍 [createDonation] Initial Lat/Long: ${lat}, ${lon}`);

        // Fallback geocoding
        if ((lat === null || lon === null) && location) {
            console.log('🌍 [createDonation] Attempting Geocoding for:', location);
            try {
                const geoResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`,
                    { headers: { 'User-Agent': 'ZeroHungerPlatform/1.0' } }
                );
                const geoData = await geoResponse.json();

                if (geoData?.length > 0) {
                    lat = parseFloat(geoData[0].lat);
                    lon = parseFloat(geoData[0].lon);
                    console.log(`📍 [createDonation] Geocoding Success: ${lat}, ${lon}`);
                } else {
                    console.warn('⚠️ [createDonation] Geocoding returned no results');
                }
            } catch (geoError) {
                console.error('❌ [createDonation] Geocoding Error:', geoError.message);
            }
        }

        // Final fallback
        if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
            console.warn('⚠️ [createDonation] Using Default Hyderabad Coordinates');
            lat = 17.3850;
            lon = 78.4867;
        }

        const newRequest = {
            donor_id: req.user?.uid || null,
            donor_name: orgName || 'Anonymous',
            donor_type: donorType || 'individual',
            food_details: `${foodType || 'Food'} - ${quantity} Meals`,
            quantity: quantity || 0,
            pickup_address: location || '',
            pickup_location: {
                lat: typeof lat === 'number' ? lat : 0,
                lng: typeof lon === 'number' ? lon : 0
            },
            expiry_time: time || null,
            status: 'created',
            food_image: food_image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80',
            created_at: new Date().toISOString(),

            // Legacy support
            foodItem: `${foodType || 'Food'} - ${quantity} Meals`,
            location: location || '',
            orgName: orgName || 'Anonymous'
        };

        // 5. Log before DB write
        console.log('💾 [createDonation] Writing to Firestore...');
        const docRef = await db.collection('food_requests').add(newRequest);
        console.log('✅ [createDonation] Success! Doc ID:', docRef.id);

        return res.status(201).json({
            id: docRef.id,
            ...newRequest
        });
    } catch (error) {
        // 6. Log error with stack trace
        console.error('❌ [createDonation] CRITICAL ERROR:', error);
        console.error(error.stack);

        return res.status(500).json({
            message: error.message || 'Error creating food request',
            details: error.toString()
        });
    }
};

// @desc    Get donor's donations
const getDonorDonations = async (req, res) => {
    try {
        const userId = req.user?.uid;
        // Support unauthenticated access: return empty list for personal routes
        if (!userId) {
            console.warn('⚠️ [getDonorDonations] No user found, returning empty list');
            return res.status(200).json([]);
        }

        const snapshot = await db
            .collection('food_requests')
            .where('donor_id', '==', userId)
            .get();

        const results = [];
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

        return res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching donor requests:', error);
        return res.status(500).json({
            message: 'Error fetching your requests'
        });
    }
};

// @desc    Get receiver's assigned donations
const getReceiverDonations = async (req, res) => {
    try {
        const userId = req.user?.uid;
        // Support unauthenticated access: return empty list for personal routes
        if (!userId) {
            console.warn('⚠️ [getReceiverDonations] No user found, returning empty list');
            return res.status(200).json([]);
        }

        const snapshot = await db
            .collection('food_requests')
            .where('receiver_id', '==', userId)
            .get();

        const results = [];
        snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));

        return res.status(200).json(results);
    } catch (error) {
        console.error('Error fetching receiver requests:', error);
        return res.status(500).json({
            message: 'Error fetching your assigned tasks'
        });
    }
};

module.exports = {
    getDonations,
    createDonation,
    getDonorDonations,
    getReceiverDonations
};
