import React, { useState, useEffect } from 'react';
import {
    Package,
    User,
    MapPin,
    Clock,
    Heart,
    Navigation,
    ShieldCheck,
    AlertCircle,
    ChevronRight,
    Bike,
    Truck,
    CheckCircle2,
    Users
} from 'lucide-react';
import { db } from '../firebase';
import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp,
    runTransaction
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to re-center map when coordinates change
const RecenterMap = ({ center }) => {
    const map = L.DomUtil.get('map') ? null : require('react-leaflet').useMap();
    // Actually react-leaflet provides useMap hook
    return null;
};

// Correct way to use useMap within MapContainer
const MapController = ({ pickup, drop }) => {
    const map = useMap();
    useEffect(() => {
        if (pickup && drop) {
            const bounds = L.latLngBounds([
                [pickup.lat, pickup.lng],
                [drop.lat, drop.lng]
            ]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (pickup) {
            map.setView([pickup.lat, pickup.lng], 14);
        }
    }, [pickup, drop, map]);
    return null;
};

const CoordinatorDashboard = () => {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState(null);

    // Real-time Firestore Listener
    useEffect(() => {
        // Broad query to avoid composite index requirements
        const q = query(collection(db, "food_requests"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allTasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter and sort manually to bypass index requirements
            const filteredTasks = allTasks
                .filter(t => ["created", "assigned", "picked_up", "delivered"].includes(t.status))
                .sort((a, b) => {
                    const dateA = new Date(a.created_at || 0);
                    const dateB = new Date(b.created_at || 0);
                    return dateB - dateA;
                });

            setTasks(filteredTasks);
        });

        return () => unsubscribe();
    }, []);

    const newRedistributionTasks = tasks.filter(t => t.status === 'created');
    // Only show missions assigned TO the current user
    const activeMissions = tasks.filter(t => (t.status === 'assigned' || t.status === 'picked_up') && t.volunteer_id === currentUser?.uid);
    const completedMissions = tasks.filter(t => t.status === 'delivered' && t.volunteer_id === currentUser?.uid);

    useEffect(() => {
        // Auto-select the first active mission if none selected
        if (activeMissions.length > 0) {
            if (!selectedTask || !activeMissions.find(m => m.id === selectedTask.id)) {
                setSelectedTask(activeMissions[0]);
            } else {
                // Keep selectedTask updated with live data from the missions list
                const updated = activeMissions.find(m => m.id === selectedTask.id);
                if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask)) {
                    setSelectedTask(updated);
                }
            }
        } else {
            setSelectedTask(null);
        }
    }, [activeMissions, selectedTask]);

    const getUrgencyColor = (urgency) => {
        switch (urgency?.toLowerCase()) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'medium': return 'bg-yellow-500 text-gray-900';
            default: return 'bg-emerald-500 text-white';
        }
    };

    // Step 2: Accept Delivery Logic
    // Step 2: Accept Delivery Logic (with Transaction Locking)
    const handleAcceptDelivery = async (taskId) => {
        if (!currentUser) return;
        setAcceptingId(taskId);

        try {
            await runTransaction(db, async (transaction) => {
                const taskRef = doc(db, "food_requests", taskId);
                const taskDoc = await transaction.get(taskRef);

                if (!taskDoc.exists()) {
                    throw "Task does not exist!";
                }

                const data = taskDoc.data();
                if (data.status !== 'created' || data.volunteer_id) {
                    throw "Task already accepted by another volunteer!";
                }

                transaction.update(taskRef, {
                    status: "assigned",
                    volunteer_id: currentUser.uid,
                    coordinator_id: currentUser.uid,
                    accepted_at: serverTimestamp()
                });
            });
            console.log("Task accepted successfully");
        } catch (error) {
            console.error("Error accepting delivery:", error);
            alert(typeof error === 'string' ? error : "Could not accept delivery. It might have been taken.");
        } finally {
            setAcceptingId(null);
        }
    };

    // Step 4: Pickup & Delivery Flow
    const handlePickup = async (taskId) => {
        try {
            const taskRef = doc(db, "food_requests", taskId);
            await updateDoc(taskRef, {
                status: "picked_up",
                pickup_time: serverTimestamp()
            });
        } catch (error) {
            console.error("Error confirming pickup:", error);
        }
    };

    const handleDelivery = async (taskId) => {
        try {
            const taskRef = doc(db, "food_requests", taskId);
            await updateDoc(taskRef, {
                status: "delivered",
                delivered_at: serverTimestamp()
            });
            setIsConfirmModalOpen(false);
            setTaskToComplete(null);
        } catch (error) {
            console.error("Error confirming delivery:", error);
        }
    };

    const triggerDeliveryConfirm = (taskId) => {
        setTaskToComplete(taskId);
        setIsConfirmModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] pt-24 pb-20">
            {/* Impact Bar - Non-Commercial Stats (Hidden during active mission) */}
            {!activeMissions.length && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 transition-all animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex items-center gap-4">
                            <div className="bg-emerald-500 p-3 rounded-2xl text-white">
                                <Heart size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Meals Rescued</p>
                                <p className="text-xl font-black text-gray-900">4,280</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex items-center gap-4">
                            <div className="bg-blue-500 p-3 rounded-2xl text-white">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Lives Impacted</p>
                                <p className="text-xl font-black text-gray-900">1,120</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex items-center gap-4">
                            <div className="bg-orange-500 p-3 rounded-2xl text-white">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Partner Points</p>
                                <p className="text-xl font-black text-gray-900">850 XP</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-purple-100 flex items-center gap-4">
                            <div className="bg-purple-500 p-3 rounded-2xl text-white">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Vol. Hours</p>
                                <p className="text-xl font-black text-gray-900">124 h</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-500 ${activeMissions.length ? 'max-w-[1400px]' : 'max-w-7xl'}`}>
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Column: Mission Map (Point 1 to Point 2) */}
                    {activeMissions.length > 0 && (
                        <div className="lg:w-1/2 lg:sticky lg:top-32 space-y-6 shrink-0 order-2 lg:order-1 transition-all animate-in slide-in-from-left-4 duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mission Map</h2>
                                <p className="text-gray-500 font-medium mt-1">Point 1 (Restaurant) ➔ Point 2 (Requester)</p>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-[600px] flex flex-col">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-emerald-50/30">
                                    <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                                        <MapPin size={18} className="text-emerald-600" /> Active Route
                                    </p>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-emerald-100">
                                        Live Trace
                                    </span>
                                </div>

                                <div className="flex-1 relative z-0">
                                    {selectedTask && selectedTask.pickup_location && selectedTask.drop_location && (
                                        <MapContainer
                                            center={[selectedTask.pickup_location.lat, selectedTask.pickup_location.lng]}
                                            zoom={14}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom={false}
                                        >
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <MapController
                                                pickup={selectedTask.pickup_location}
                                                drop={selectedTask.drop_location}
                                            />
                                            <Marker position={[selectedTask.pickup_location.lat, selectedTask.pickup_location.lng]}>
                                                <Popup>
                                                    <div className="font-bold">Point 1: Restaurant</div>
                                                    <div>{selectedTask.donor_name}</div>
                                                </Popup>
                                            </Marker>
                                            <Marker position={[selectedTask.drop_location.lat, selectedTask.drop_location.lng]}>
                                                <Popup>
                                                    <div className="font-bold">Point 2: Requester</div>
                                                    <div>{selectedTask.receiver_name}</div>
                                                </Popup>
                                            </Marker>
                                            <Polyline
                                                positions={[
                                                    [selectedTask.pickup_location.lat, selectedTask.pickup_location.lng],
                                                    [selectedTask.drop_location.lat, selectedTask.drop_location.lng]
                                                ]}
                                                color="#10b981"
                                                weight={selectedTask.status === 'picked_up' ? 6 : 4}
                                                dashArray={selectedTask.status === 'picked_up' ? "0" : "10, 10"}
                                            />
                                        </MapContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Center Column: Main Task Feed (Hidden during active mission) */}
                    {!activeMissions.length && (
                        <div className="flex-1 space-y-8 order-1 lg:order-2 transition-all animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    New Tasks <span className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-md font-black tracking-widest">ACTIVE NOW</span>
                                </h2>
                                <p className="text-gray-500 font-medium mt-1">Accept missions to transport food to designated shelters</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                                {newRedistributionTasks.length === 0 ? (
                                    <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                                        <Package size={48} className="mx-auto text-gray-200 mb-4" />
                                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs px-6">No active requests right now. New food donations will appear here automatically.</p>
                                    </div>
                                ) : (
                                    newRedistributionTasks.map((task) => (
                                        <div key={task.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                                            <div className="relative h-48">
                                                <img src={task.food_image || 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80'} alt={task.food_details} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                                <div className="absolute bottom-6 left-6 right-6">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${getUrgencyColor(task.urgency)}`}>
                                                            {task.urgency || 'Normal'}
                                                        </span>
                                                        <span className="text-emerald-400 text-xs font-bold">{task.impact || 'Feeding Local Shellters'}</span>
                                                    </div>
                                                    <p className="text-white font-black text-2xl leading-none">{task.donor_name || 'Restaurant Partner'}</p>
                                                    <p className="text-gray-300 text-xs font-bold mt-1">{task.food_details}</p>
                                                </div>
                                                <div className="absolute top-4 right-4 bg-white px-3 py-1.5 rounded-2xl text-[10px] font-black tracking-widest shadow-lg flex items-center gap-1.5 text-gray-900">
                                                    <Navigation size={12} className="text-emerald-600" /> {task.distance || 'Near you'}
                                                </div>
                                            </div>

                                            <div className="p-8 space-y-6">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-1 text-emerald-600">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pickup Location</p>
                                                        <p className="text-sm font-bold text-gray-700">{task.pickup_address}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between py-2 border-t border-gray-50 pt-6">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</p>
                                                        <p className="text-xl font-black text-emerald-600">{task.quantity || 'Multiple Meals'}</p>
                                                    </div>
                                                    <button
                                                        disabled={acceptingId === task.id}
                                                        onClick={() => handleAcceptDelivery(task.id)}
                                                        className={`bg-gray-900 text-white h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-gray-200 ${acceptingId === task.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {acceptingId === task.id ? 'Accepting...' : 'Accept Delivery'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Completed Deliveries Section */}
                            <div className="pt-8 mt-4">
                                <div className="bg-slate-100/80 backdrop-blur-md rounded-[3rem] p-4 sm:p-8 border border-slate-200 shadow-inner">
                                    <div className="space-y-8">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-emerald-50 gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-emerald-500 p-2.5 rounded-2xl text-white shadow-lg shadow-emerald-200">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                                        Completed
                                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-md font-black tracking-widest uppercase">Success</span>
                                                    </h2>
                                                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mt-0.5">Your Impact Summary</p>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-50/50 px-6 py-2 rounded-xl border border-emerald-100 text-right">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Deliveries</p>
                                                <p className="text-2xl font-black text-emerald-700 leading-none">{completedMissions.length}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
                                            {completedMissions.length === 0 ? (
                                                <div className="col-span-full bg-white/60 rounded-[2.5rem] p-16 text-center border-2 border-dashed border-emerald-100/50">
                                                    <ShieldCheck size={48} className="mx-auto text-emerald-200 mb-4" />
                                                    <p className="text-emerald-800 font-black text-lg px-8">No deliveries completed yet. Finish a delivery to see it listed here.</p>
                                                    <p className="text-emerald-600/60 font-medium text-sm mt-1">Accept a mission above to start making a difference!</p>
                                                </div>
                                            ) : (
                                                completedMissions.map((task) => (
                                                    <div key={task.id} className="bg-white rounded-[2.5rem] p-8 border border-emerald-50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-6 group">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                                                                    <Package size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mission Order</p>
                                                                    <p className="text-sm font-black text-gray-400">#{task.id.slice(-6).toUpperCase()}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantity</p>
                                                                <p className="text-lg font-black text-emerald-600">{task.quantity || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-4 pt-2">
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-1 bg-emerald-50 p-1.5 rounded-lg">
                                                                    <MapPin size={16} className="text-emerald-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Pickup</p>
                                                                    <p className="text-sm font-bold text-gray-700 line-clamp-1">{task.donor_name || task.pickup_address}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-3">
                                                                <div className="mt-1 bg-blue-50 p-1.5 rounded-lg">
                                                                    <Navigation size={16} className="text-blue-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Drop</p>
                                                                    <p className="text-sm font-bold text-gray-700 line-clamp-1">{task.receiver_name || task.drop_address}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                                            <div className="flex items-center gap-2 text-gray-400">
                                                                <Clock size={14} />
                                                                <p className="text-[10px] font-bold uppercase tracking-wider">
                                                                    {task.delivered_at?.toDate ? task.delivered_at.toDate().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) :
                                                                        task.delivered_at ? new Date(task.delivered_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Delivered</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Column: Logistics Hub (Controls) */}
                    <div className={`lg:sticky lg:top-32 space-y-8 transition-all duration-500 ${activeMissions.length ? 'lg:w-1/2 order-1 lg:order-2' : 'lg:w-96 order-3'} text-white`}>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Logistics Hub</h2>
                            <p className="text-gray-500 font-medium mt-1">Real-time mission tracking</p>
                        </div>

                        {activeMissions.length === 0 ? (
                            <div className="bg-[#1A1F2E] rounded-[3rem] p-10 text-center border border-white/5 opacity-50">
                                <Bike size={32} className="mx-auto text-blue-400/50 mb-3" />
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">No active missions</p>
                            </div>
                        ) : (
                            activeMissions.map((task) => (
                                <div key={task.id} className="bg-[#1A1F2E] rounded-[3rem] p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
                                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                                    <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

                                    <div className="relative z-10 space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-emerald-500 p-4 rounded-[1.5rem] shadow-xl shadow-emerald-500/20">
                                                {task.transport_type === 'truck' ? <Truck size={28} /> : <Bike size={28} />}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Status</p>
                                                <p className="text-xl font-black italic text-emerald-400 uppercase">{task.status.replace('_', ' ')}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black leading-tight tracking-tight">{task.receiver_name || 'Community Shelter'}</h3>
                                            <p className="text-blue-400/80 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">MISSION: {task.id.slice(0, 8).toUpperCase()}</p>
                                        </div>

                                        {/* Logistics Route Visualizer */}
                                        <div className="space-y-6 pt-4">
                                            <div className="flex gap-5">
                                                <div className="flex flex-col items-center pt-1">
                                                    <div className={`size-4 rounded-full ${task.status === 'picked_up' ? 'bg-emerald-500' : 'bg-gray-600'} border-4 border-[#1A1F2E] ring-1 ring-emerald-500/50`}></div>
                                                    <div className="w-px h-12 bg-gradient-to-b from-emerald-500 to-blue-500 opacity-20 my-1"></div>
                                                    <div className="size-4 rounded-full bg-blue-500 border-4 border-[#1A1F2E] ring-1 ring-blue-500/50"></div>
                                                </div>
                                                <div className="space-y-8 flex-1">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Point 1 (Pickup)</p>
                                                        <p className="text-sm font-bold text-gray-200 line-clamp-1">{task.pickup_address}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Point 2 (Drop)</p>
                                                        <p className="text-sm font-bold text-gray-200 line-clamp-1">{task.drop_address}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mission Controls */}
                                        <div className="grid grid-cols-1 gap-3 pt-4">
                                            <button
                                                disabled={task.status !== 'assigned'}
                                                onClick={() => handlePickup(task.id)}
                                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${task.status === 'assigned' ? 'bg-white/5 border border-white/10 text-white hover:bg-white/10' : 'bg-black/20 text-gray-600 cursor-not-allowed'}`}
                                            >
                                                <Package size={16} className={task.status === 'assigned' ? "text-emerald-400" : "text-gray-600"} /> Confirm Pickup
                                            </button>
                                            <button
                                                disabled={task.status !== 'picked_up'}
                                                onClick={() => triggerDeliveryConfirm(task.id)}
                                                className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg ${task.status === 'picked_up' ? 'bg-emerald-500 text-gray-900 hover:bg-emerald-400' : 'bg-black/20 text-gray-600 cursor-not-allowed'}`}
                                            >
                                                {task.status === 'delivered' ? 'Reached' : 'Confirm Delivery (Reached)'}
                                            </button>
                                        </div>

                                        <button className="w-full text-gray-500 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-red-400 transition-all flex items-center justify-center gap-2">
                                            <AlertCircle size={14} /> Report Coordination Issue
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-300 border border-gray-100">
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 leading-tight">Complete Delivery?</h3>
                            <p className="text-gray-500 font-medium text-sm">Are you sure you want to mark this delivery as completed?</p>

                            <div className="flex flex-col gap-3 pt-6">
                                <button
                                    onClick={() => handleDelivery(taskToComplete)}
                                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-200"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => {
                                        setIsConfirmModalOpen(false);
                                        setTaskToComplete(null);
                                    }}
                                    className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoordinatorDashboard;
