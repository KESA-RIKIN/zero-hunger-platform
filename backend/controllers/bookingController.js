const { db } = require('../config/firebaseConfig');

// @desc    Create a new booking (claim food)
// @route   POST /api/bookings
const createBooking = async (req, res) => {
    const { donationId, receiverName, drop_address, drop_lat, drop_lng } = req.body;

    if (!donationId) {
        return res.status(400).json({ message: 'Request ID (donationId) is required' });
    }

    try {
        const requestRef = db.collection('food_requests').doc(donationId);

        // Use a transaction to ensure atomicity
        await db.runTransaction(async (t) => {
            const doc = await t.get(requestRef);

            if (!doc.exists) {
                throw new Error("Food request not found");
            }

            const data = doc.data();
            // A request can be claimed if status is 'created' (meaning it's a donation waiting for a receiver)
            // Or if it's already 'available' in legacy terms.
            if (data.status !== 'created' && data.status !== 'available') {
                throw new Error("This request is no longer available");
            }

            // Update with receiver info and coordinates
            // Fallback coordinates if not provided (Hyderabad Area)
            const lat = parseFloat(drop_lat) || (17.4 + (Math.random() - 0.5) * 0.1);
            const lng = parseFloat(drop_lng) || (78.5 + (Math.random() - 0.5) * 0.1);

            t.update(requestRef, {
                receiver_name: receiverName || "Community Shelter",
                receiver_id: req.user.uid,
                drop_address: drop_address || "Designated Shelter Point",
                drop_location: { lat, lng },
                booked_at: new Date().toISOString(),
                // Keep status as 'created' for the Coordinator to see and Assign
                // OR we can move it to a specific status if needed. 
                // The user said: "Filter where status IN ["created", "assigned", "picked_up"]"
                // So keeping it as 'created' until a coordinator assigns it.
            });
        });

        const updatedDoc = await requestRef.get();
        res.status(201).json({
            message: 'Order updated successfully',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });

    } catch (error) {
        console.error('Error processing booking:', error);
        res.status(500).json({ message: error.message || 'Error processing request' });
    }
};

module.exports = {
    createBooking
};
