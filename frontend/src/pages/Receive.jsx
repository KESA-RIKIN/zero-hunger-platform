import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bike, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DonationMap from '../components/DonationMap';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

const Receive = () => {
    const [availableDonations, setAvailableDonations] = useState([]);
    const [activeRequest, setActiveRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

    useEffect(() => {
        // Broad query to avoid composite index requirements
        // We will filter and sort in memory for better compatibility
        const q = query(collection(db, 'food_requests'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allDonations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter and sort manually to bypass index requirements
            const filtered = allDonations
                .filter(d => d.status === 'created' && !d.receiver_id)
                .sort((a, b) => {
                    // Sort by created_at descending (newest first)
                    const dateA = new Date(a.created_at || 0);
                    const dateB = new Date(b.created_at || 0);
                    return dateB - dateA;
                });

            setAvailableDonations(filtered);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching donations:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Real-time listener for user's own active request
    useEffect(() => {
        if (!currentUser) return;

        const q = query(collection(db, 'food_requests'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter locally for current user's requests that are not yet finished
            const myRequests = allRequests
                .filter(r => r.receiver_id === currentUser.uid)
                .sort((a, b) => {
                    const dateA = new Date(a.booked_at || a.created_at || 0);
                    const dateB = new Date(b.booked_at || b.created_at || 0);
                    return dateB - dateA;
                });

            if (myRequests.length > 0) {
                const latest = myRequests[0];
                if (latest.status !== 'delivered') {
                    setActiveRequest(latest);
                } else {
                    // Show delivered success for a bit
                    setActiveRequest(latest);
                    setTimeout(() => setActiveRequest(null), 15000);
                }
            } else {
                setActiveRequest(null);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleRequest = async (donationId) => {
        if (!currentUser) {
            alert("Please login to request food.");
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            // Simulating a drop-off location near the user's area for demo
            const dropLat = 17.4 + (Math.random() - 0.5) * 0.05;
            const dropLng = 78.5 + (Math.random() - 0.5) * 0.05;

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await fetch(`${API_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    donationId,
                    receiverName: currentUser.displayName || currentUser.email.split('@')[0],
                    drop_address: "Community Distribution Center (Auto-assigned)",
                    drop_lat: dropLat,
                    drop_lng: dropLng
                })
            });

            if (response.ok) {
                alert("Request sent successfully! Awaiting coordinator assignment.");
                // Optimistically update UI
                setAvailableDonations(prev => prev.filter(d => d.id !== donationId));
            } else {
                const errorData = await response.json();
                alert(`Failed to request food: ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error requesting food:", error);
            alert("An error occurred.");
        }
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-[#111713] dark:text-white antialiased min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-2">
                            <Link to="/" className="size-8 text-primary">
                                <span className="material-symbols-outlined text-3xl">eco</span>
                            </Link>
                            <span className="text-[#111713] dark:text-white text-xl font-extrabold tracking-tight">Zero Hunger</span>
                        </div>
                        <div className="hidden md:flex space-x-8">
                            <button onClick={() => setViewMode('list')} className={`font-bold hover:text-primary transition-colors py-1 ${viewMode === 'list' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Listings</button>
                            <button onClick={() => setViewMode('map')} className={`font-medium hover:text-primary transition-colors py-1 ${viewMode === 'map' ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}>Map View</button>
                            <Link to="/dashboard" className="text-gray-500 dark:text-gray-400 font-medium hover:text-primary transition-colors py-1">Dashboard</Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {currentUser?.email?.[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Live Status Notification */}
                {activeRequest && (
                    <div className={`mb-8 p-6 rounded-[2rem] border shadow-lg flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-4 duration-500 ${activeRequest.status === 'delivered' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-2xl shadow-sm ${activeRequest.status === 'delivered' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                                }`}>
                                {activeRequest.status === 'delivered' ? <CheckCircle2 size={24} /> : <Bike size={24} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">
                                    {activeRequest.status === 'delivered' ? 'Mission Success' : `Delivery Status: ${activeRequest.status.replace('_', ' ').toUpperCase()}`}
                                </h3>
                                <p className="text-lg font-bold text-gray-700">
                                    {activeRequest.status === 'assigned' && "A volunteer has accepted your request and is on the way!"}
                                    {activeRequest.status === 'picked_up' && "Food has been picked up and is on the way to you!"}
                                    {activeRequest.status === 'delivered' && "SUCCESS! Your food has been delivered successfully."}
                                    {activeRequest.status === 'created' && "Awaiting coordinator assignment..."}
                                </p>
                            </div>
                        </div>
                        {activeRequest.status !== 'delivered' && (
                            <div className="hidden md:block">
                                <span className="bg-white/50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100">
                                    Live Updates Active
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl lg:text-4xl font-black text-[#111713] dark:text-white mb-2 tracking-tight">Available Food Donations</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">Connect with local donors and rescue surplus food.</p>
                    </div>
                </div>

                {viewMode === 'map' ? (
                    <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100">
                        <DonationMap availableDonations={availableDonations} handleRequest={handleRequest} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {loading ? (
                            <div className="col-span-full text-center py-10">Loading donations...</div>
                        ) : availableDonations.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-gray-500 bg-white dark:bg-card-dark rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 px-6">
                                <span className="material-symbols-outlined text-5xl text-gray-200 mb-4">inventory_2</span>
                                <p className="text-lg font-bold text-gray-400">No available food rescues right now.</p>
                                <p className="text-sm mt-1">New donations from our partners will appear here as soon as they are listed.</p>
                            </div>
                        ) : (
                            availableDonations.map((donation) => (
                                <div key={donation.id} className="group bg-white dark:bg-card-dark rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                            <span className="material-symbols-outlined text-3xl">nutrition</span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 uppercase tracking-wide">
                                            {donation.donor_type || 'Food'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-extrabold text-[#111713] dark:text-white mb-1 truncate">{donation.food_details || donation.foodItem}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{donation.donor_type === 'restaurant' ? 'Restaurant Surplus' : 'Community Donation'}</p>

                                    <div className="space-y-3 mb-6 flex-grow border-t border-gray-100 dark:border-gray-700 pt-4">
                                        <div className="flex items-start gap-3 text-sm">
                                            <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">storefront</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200">{donation.donor_name || 'Anonymous Donor'}</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm">
                                            <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">location_on</span>
                                            <span className="text-gray-600 dark:text-gray-400 truncate">{donation.pickup_address || donation.location}</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm">
                                            <span className="material-symbols-outlined text-gray-400 text-[20px] mt-0.5">inventory_2</span>
                                            <span className="text-gray-600 dark:text-gray-400">{donation.quantity} Meals</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-sm">
                                            <span className="material-symbols-outlined text-accent-orange text-[20px] mt-0.5">schedule</span>
                                            <span className="text-accent-orange font-bold">{donation.expiry_time || 'Available Now'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRequest(donation.id)}
                                        className="w-full py-3.5 rounded-xl bg-[#111713] dark:bg-white text-white dark:text-[#111713] font-bold text-sm hover:bg-primary dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
                                    >
                                        <span>Request Food</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Receive;
