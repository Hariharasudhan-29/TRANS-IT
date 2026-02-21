import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { initFirebase } from '../firebaseClient';
import { getAuth, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, where, limit, getDocs, updateDoc, addDoc, orderBy, serverTimestamp, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import {
    LayoutDashboard, Clock, MapPin, Users, ShieldCheck, LogOut, User, X, Save, HelpCircle,
    MessageSquare, Star, AlertTriangle, Moon, Sun, Heart, History, TrendingUp, Info, Edit, Search, Bell, Menu
} from 'lucide-react';
import { BUS_ROUTES } from '../data/busRoutes';

// Dynamic Import for Map (SSR false)
const Map = dynamic(() => import('../components/Map'), { ssr: false });

const SRM_COORDS = { lat: 9.8283847, lng: 78.1713945 };
const VISUAL_SEATS = 50; // Total Bus Capacity

export default function StudentDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [busNumber, setBusNumber] = useState('');
    const [trackingBus, setTrackingBus] = useState(null);
    const [busLocation, setBusLocation] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [showNav, setShowNav] = useState(false);

    // Feature States
    const [darkMode, setDarkMode] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [showRouteInfo, setShowRouteInfo] = useState(false);

    // Profile & Support State
    const [showProfile, setShowProfile] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [newName, setNewName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [queryText, setQueryText] = useState('');
    const [queryBus, setQueryBus] = useState('');

    // Rating State
    const [showRating, setShowRating] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingComment, setRatingComment] = useState('');

    // Announcement & Notification State
    const [announcement, setAnnouncement] = useState(null);
    const [resolvedNotifications, setResolvedNotifications] = useState([]);

    // Registration State
    const [showRegistration, setShowRegistration] = useState(false);
    const [isApproved, setIsApproved] = useState(true); // default true until DB says otherwise
    const [regForm, setRegForm] = useState({
        name: '', busNumber: '', department: '', year: '', address: '', phoneNumber: '', parentPhoneNumber: '', stopName: ''
    });

    // Route Logic
    const [allRoutes, setAllRoutes] = useState(BUS_ROUTES);

    // Lost & Found
    const [showLostFound, setShowLostFound] = useState(false);
    const [lostFoundItems, setLostFoundItems] = useState([]);
    const [lostItemForm, setLostItemForm] = useState({ item: '', desc: '', bus: '' });

    // Delay Notifications & Alerts
    const [delayNotifications, setDelayNotifications] = useState([]);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [proximityAlert, setProximityAlert] = useState(null);
    const [busDelay, setBusDelay] = useState(null);

    // Leave Application & Bus Pass
    const [showLeave, setShowLeave] = useState(false);
    const [isOnLeave, setIsOnLeave] = useState(false);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [showBusPass, setShowBusPass] = useState(false);



    useEffect(() => {
        initFirebase();
        const db = getFirestore();
        const unsub = onSnapshot(collection(db, 'routes'), (snap) => {
            const newRoutes = { ...BUS_ROUTES };
            snap.forEach(doc => {
                newRoutes[doc.id] = doc.data();
            });
            setAllRoutes(newRoutes);
        });

        // Lost & Found Fetch
        const qLost = query(collection(db, 'lost_found'), orderBy('createdAt', 'desc'));
        const unsubLost = onSnapshot(qLost, (snap) => {
            setLostFoundItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Check today's leave status
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
            const today = new Date().toLocaleDateString('en-CA');
            const qLeave = query(collection(db, 'leave_requests'), where('studentId', '==', currentUser.uid), where('date', '==', today));
            const unsubLeave = onSnapshot(qLeave, (snap) => {
                setIsOnLeave(!snap.empty);
            });
            return () => { unsub(); unsubLost(); unsubLeave(); };
        }

        return () => { unsub(); unsubLost(); };
    }, []);

    const currentRoute = trackingBus && allRoutes[trackingBus] ? allRoutes[trackingBus] : null;
    const currentStops = currentRoute ? currentRoute.stops : [];
    const [selectedStop, setSelectedStop] = useState(currentStops[0] || null);

    // Update selected stop when bus changes
    useEffect(() => {
        if (currentStops.length > 0) setSelectedStop(currentStops[0]);
    }, [trackingBus]);

    // Derived Stats
    const currentPassengers = busLocation?.passengerCount || 0;
    const seatsLeft = Math.max(0, VISUAL_SEATS - currentPassengers);
    const seatPercentage = Math.round((currentPassengers / VISUAL_SEATS) * 100);

    // Calculate Occupancy Level Color
    const getOccupancyColor = () => {
        if (seatPercentage > 90) return '#ef4444'; // Red (Full)
        if (seatPercentage > 60) return '#f59e0b'; // Amber (Busy)
        return '#10b981'; // Green (Open)
    };

    const [routeStats, setRouteStats] = useState({ distance: null, duration: null });
    const isBoarded = router.query.boarded === 'true';

    // Theme Logic
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') setDarkMode(true);

        const storedFavs = JSON.parse(localStorage.getItem('favorites') || '[]');
        setFavorites(storedFavs);
    }, []);

    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    const toggleFavorite = (bus) => {
        let newFavs;
        if (favorites.includes(bus)) {
            newFavs = favorites.filter(b => b !== bus);
        } else {
            newFavs = [bus, ...favorites].slice(0, 3); // Keep max 3
        }
        setFavorites(newFavs);
        localStorage.setItem('favorites', JSON.stringify(newFavs));
    };

    // Driver Offline Logic
    const [isDriverOffline, setIsDriverOffline] = useState(false);

    useEffect(() => {
        if (!trackingBus) return;
        const checkStatus = () => {
            if (!busLocation || !busLocation.lastUpdated) {
                setIsDriverOffline(true);
                return;
            }
            if (busLocation.active === false) {
                setIsDriverOffline(true);
                return;
            }
            const lastUpdate = busLocation.lastUpdated.seconds ? busLocation.lastUpdated.seconds * 1000 : (busLocation.lastUpdated.toMillis ? busLocation.lastUpdated.toMillis() : Date.now());
            const diff = Date.now() - lastUpdate;
            setIsDriverOffline(diff > 120000);
        };
        checkStatus();
        const timer = setInterval(checkStatus, 10000);
        return () => clearInterval(timer);
    }, [busLocation, trackingBus]);

    useEffect(() => {
        initFirebase();
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) {
                if (u.email === 'admin@transit.com') {
                    auth.signOut();
                    alert('Admin access is restricted to the Driver App.');
                    router.replace('/auth/signin');
                    return;
                }
                setUser(u);
                setNewName(u.displayName || '');
                // Replace history state to prevent back button issues
                if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', '/dashboard');
                }
            } else {
                // Use replace instead of push to prevent back button from showing dashboard
                router.replace('/auth/signin');
            }
        });
        return () => unsubscribe();
    }, []);

    // Firebase Listeners (Announcements, Notifications, Bus Location)
    // Firebase Listeners (Announcements)
    useEffect(() => {
        const db = getFirestore();
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) setAnnouncement(snap.docs[0].data());
            else setAnnouncement(null);
        });
        return () => unsub();
    }, []);

    // Check Registration and Status
    useEffect(() => {
        if (!user) return;
        const db = getFirestore();
        const docRef = doc(db, 'users', user.uid);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.disabled) {
                    const auth = getAuth();
                    auth.signOut();
                    alert('Your account has been blocked by the admin.');
                    router.replace('/auth/signin');
                    return;
                }
                if (!data.phoneNumber) {
                    setShowRegistration(true);
                    setRegForm(prev => ({ ...prev, name: user.displayName || '' }));
                } else {
                    if (data.approved === false) {
                        setIsApproved(false);
                        setShowRegistration(false);
                    } else {
                        setIsApproved(true);
                    }
                    setRegForm({ ...regForm, ...data });
                }
            } else {
                setShowRegistration(true);
                setRegForm(prev => ({ ...prev, name: user.displayName || '' }));
            }
        });
        return () => unsub();
    }, [user, router]);

    // Query Notifications
    useEffect(() => {
        if (!user) return;
        const db = getFirestore();
        const q = query(collection(db, 'queries'), where('studentId', '==', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const resolved = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.status === 'completed' && !d.studentRead);
            setResolvedNotifications(resolved);
        });
        return () => unsub();
    }, [user]);

    const handleDismissNotification = async (id) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'queries', id), { studentRead: true });
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (router.query.bus) setTrackingBus(router.query.bus);
    }, [router.query.bus]);

    useEffect(() => {
        if (!trackingBus) return;
        const db = getFirestore();
        const unsubLoc = onSnapshot(doc(db, 'tracking', trackingBus), (doc) => {
            setBusLocation(doc.data());
        });
        return () => unsubLoc();
    }, [trackingBus]);

    useEffect(() => {
        if (!("geolocation" in navigator)) return;
        const watchId = navigator.geolocation.watchPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => console.error(err),
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Route Calculation (OSRM) - DIY Throttle
    const lastOSRMCall = useRef(0);

    useEffect(() => {
        if (!busLocation) {
            setRouteStats({ distance: null, duration: null });
            return;
        }

        const targetLat = isBoarded ? SRM_COORDS.lat : (selectedStop?.lat || userLocation?.lat);
        const targetLng = isBoarded ? SRM_COORDS.lng : (selectedStop?.lng || userLocation?.lng);

        if (!targetLat || !targetLng) return;

        const now = Date.now();
        // Throttle: Only fetch if 30s have passed since last call
        if (now - lastOSRMCall.current < 30000) return;

        const fetchOSRM = async () => {
            lastOSRMCall.current = Date.now();
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${busLocation.lng},${busLocation.lat};${targetLng},${targetLat}?overview=false`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`OSRM fetch failed: ${res.status}`);
                const data = await res.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    setRouteStats({ distance: (route.distance / 1000).toFixed(1), duration: Math.round(route.duration / 60) });
                } else {
                    setRouteStats({ distance: '--', duration: '--' });
                }
            } catch (err) { console.error("OSRM Error:", err); }
        };
        fetchOSRM();
    }, [busLocation, userLocation, isBoarded, selectedStop]);

    // Listen for delay notifications for tracked bus
    useEffect(() => {
        if (!trackingBus || !user) return;
        const db = getFirestore();
        const q = query(
            collection(db, 'admin_notifications'),
            where('busNumber', '==', trackingBus),
            where('type', '==', 'DELAY_REPORT'),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        const unsub = onSnapshot(q, (snap) => {
            const notifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDelayNotifications(notifications);

            // Count unread notifications
            const unread = notifications.filter(n => !n.readBy || !n.readBy.includes(user.uid)).length;
            setUnreadNotifications(unread);

            // Set current delay status
            if (notifications.length > 0 && notifications[0].status === 'pending') {
                setBusDelay(notifications[0]);
            } else {
                setBusDelay(null);
            }
        });
        return () => unsub();
    }, [trackingBus, user]);

    // Proximity Alert: Check if bus is within 2km
    useEffect(() => {
        if (!busLocation || !userLocation || !selectedStop) return;

        const calculateDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const distanceToStop = calculateDistance(
            busLocation.lat, busLocation.lng,
            selectedStop.lat, selectedStop.lng
        );

        if (distanceToStop <= 2 && distanceToStop > 0.1) {
            setProximityAlert({
                distance: distanceToStop.toFixed(1),
                stopName: selectedStop.name
            });
        } else {
            setProximityAlert(null);
        }
    }, [busLocation, userLocation, selectedStop]);

    const markNotificationAsRead = async (notificationId) => {
        if (!user) return;
        try {
            const db = getFirestore();
            const notifRef = doc(db, 'admin_notifications', notificationId);
            const notifDoc = await getDoc(notifRef);
            const readBy = notifDoc.data().readBy || [];
            if (!readBy.includes(user.uid)) {
                await updateDoc(notifRef, {
                    readBy: [...readBy, user.uid]
                });
            }
        } catch (e) { console.error(e); }
    };


    const handleDropOff = async () => setShowRating(true);

    const handleSOS = async () => {
        if (!confirm("🚨 ARE YOU SURE?\n\nThis will send an immediate SOS alert to the Admin Panel with your location.")) return;
        try {
            const db = getFirestore();
            await addDoc(collection(db, 'sos_alerts'), {
                studentId: user?.uid || 'anonymous',
                studentName: user?.displayName || 'Student',
                location: userLocation || { lat: 0, lng: 0 },
                busNumber: trackingBus || 'Not Boarded',
                status: 'active',
                createdAt: serverTimestamp()
            });
            alert("SOS Alert Sent! Admins have been notified.");
        } catch (e) {
            console.error(e);
            alert("Failed to send SOS: " + e.message);
        }
    };

    const submitRatingAndDropOff = async () => {
        if (!user || !trackingBus) return;
        try {
            const db = getFirestore();
            if (rating > 0) {
                await addDoc(collection(db, 'feedback'), {
                    studentId: user.uid,
                    studentName: user.displayName || 'Anon',
                    busNumber: trackingBus,
                    rating: rating,
                    comment: ratingComment,
                    createdAt: serverTimestamp()
                });
            }
            const q = query(collection(db, 'boardings'), where('studentId', '==', user.uid), where('busNumber', '==', trackingBus), where('status', '==', 'Boarded'), limit(1));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                await updateDoc(snapshot.docs[0].ref, { status: 'Dropped Off', droppedOffAt: Date.now() });

                // Eco-Points Gamification logic
                const currentPoints = regForm.ecoPoints || 0;
                const newPoints = currentPoints + 5; // 5 points = approx 1.2kg CO2 saved per trip
                await updateDoc(doc(db, 'users', user.uid), { ecoPoints: newPoints });
                setRegForm(prev => ({ ...prev, ecoPoints: newPoints }));
            }
            router.push('/attendance');
        } catch (err) {
            console.error("Dropoff Error:", err);
            router.push('/attendance');
        }
    };

    const handleSearch = (e) => { e.preventDefault(); if (busNumber) setTrackingBus(busNumber); };

    const handleLogout = async () => {
        await signOut(getAuth());
        router.push('/auth/signin');
    };

    const handleUpdateName = async () => {
        if (!user || !newName.trim()) return;
        setIsSavingName(true);
        try {
            await updateProfile(getAuth().currentUser, { displayName: newName });
            await updateDoc(doc(getFirestore(), 'users', user.uid), { displayName: newName });
            setUser({ ...user, displayName: newName });
            setIsSavingName(false);
            setShowProfile(false);
        } catch (e) {
            console.error("Error updating name:", e);
            setIsSavingName(false);
            alert("Failed to update name");
        }
    };

    const handleSubmitQuery = async () => {
        if (!queryText.trim()) return;
        try {
            await addDoc(collection(getFirestore(), 'queries'), {
                studentId: user.uid,
                studentName: user.displayName || 'Anonymous',
                studentEmail: user.email || 'Anonymous',
                busNumber: queryBus || 'N/A',
                query: queryText,
                createdAt: serverTimestamp(),
                status: 'noted'
            });
            setQueryText('');
            setShowSupport(false);
            alert("Query submitted! Admins will check it.");
        } catch (e) { console.error(e); }
    };

    const handleReportLost = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(getFirestore(), 'lost_found'), {
                type: 'lost',
                studentId: user.uid,
                studentName: user.displayName || 'Student',
                itemName: lostItemForm.item,
                description: lostItemForm.desc,
                busNumber: lostItemForm.bus,
                status: 'reported',
                createdAt: serverTimestamp()
            });
            setLostItemForm({ item: '', desc: '', bus: '' });
            alert("Report submitted! Check 'Found Items' periodically.");
        } catch (e) { alert(e.message); }
    };

    const handleDeleteReport = async (id) => {
        if (!confirm("Remove this report?")) return;
        await deleteDoc(doc(getFirestore(), 'lost_found', id));
    };

    const handleRegister = async () => {
        // Comprehensive Validation - All fields are mandatory
        const missingFields = [];
        if (!regForm.name?.trim()) missingFields.push('Name');
        if (!regForm.busNumber) missingFields.push('Bus Number');
        if (!regForm.department?.trim()) missingFields.push('Department');
        if (!regForm.year?.trim()) missingFields.push('Year');
        if (!regForm.address?.trim()) missingFields.push('Address');
        if (!regForm.phoneNumber?.trim()) missingFields.push('Phone Number');
        if (!regForm.parentPhoneNumber?.trim()) missingFields.push("Parent's Phone Number");


        if (missingFields.length > 0) {
            alert(`Please fill in all required fields:\n\n• ${missingFields.join('\n• ')}`);
            return;
        }

        try {
            const db = getFirestore();
            await setDoc(doc(db, 'users', user.uid), {
                ...regForm,
                uid: user.uid,
                email: user.email,
                role: 'student',
                approved: false, // Explicitly set to false, requiring admin approval
                updatedAt: serverTimestamp()
            }, { merge: true });

            // Also update Auth Profile Name if changed
            if (regForm.name !== user.displayName) {
                await updateProfile(user, { displayName: regForm.name });
                setUser({ ...user, displayName: regForm.name });
            }

            setShowRegistration(false);
            alert("Profile Registered Successfully! 🎉");
        } catch (e) {
            console.error(e);
            alert("Registration Failed: " + e.message);
        }
    };

    // Theme Styles
    const theme = darkMode ? {
        bg: '#0f172a',
        text: '#f8fafc',
        card: '#1e293b',
        border: '#334155',
        subText: '#94a3b8',
        highlight: '#38bdf8',
        input: '#334155',
        mapFilter: 'brightness(0.7) invert(1) hue-rotate(180deg) contrast(0.8)'
    } : {
        bg: '#fafafa',
        text: '#0f172a',
        card: 'white',
        border: '#e2e8f0',
        subText: '#64748b',
        highlight: '#2563eb',
        input: '#f8fafc',
        mapFilter: 'none'
    };

    const BackgroundBlobs = () => (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', top: '-10%', left: '-10%', width: '500px', height: '500px', background: darkMode ? 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0) 70%)' : 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
            <motion.div animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.5, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '600px', height: '600px', background: darkMode ? 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%)' : 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0) 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        </div>
    );

    return (
        <div style={{ height: '100vh', background: theme.bg, display: 'flex', flexDirection: 'column', color: theme.text, fontFamily: '"Outfit", "Inter", sans-serif', overflow: 'hidden', transition: 'background 0.3s, color 0.3s' }}>
            <style jsx global>{`
                select option {
                    color: #000000 !important;
                    background-color: #ffffff !important;
                }
                select {
                    color: #000000 !important;
                }
            `}</style>
            <BackgroundBlobs />

            {!isApproved && !showRegistration ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', zIndex: 10 }}>
                    <div style={{ fontSize: '80px', marginBottom: '16px' }}>⏳</div>
                    <h1 style={{ fontSize: '32px', margin: '0 0 16px 0', background: 'linear-gradient(to right, #2563eb, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800' }}>Waiting for Admin Approval</h1>
                    <p style={{ color: theme.subText, fontSize: '18px', maxWidth: '400px', lineHeight: '1.6' }}>
                        Your registration has been submitted successfully! However, you must wait for a Campus Admin to approve your account before you can track buses and view your dashboard.
                    </p>
                    <button onClick={handleLogout} style={{ marginTop: '24px', padding: '12px 24px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        Sign Out
                    </button>
                </div>
            ) : (
                <>

                    {/* Header */}
                    <div style={{ background: darkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, zIndex: 20 }}>
                        <div onClick={() => setShowProfile(true)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', background: 'linear-gradient(to right, #2563eb, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                                    {user ? `Hey ${user.displayName?.split(' ')[0] || 'Student'}! 👋` : 'Campus Transit'}
                                </h1>
                                <div style={{ width: '24px', height: '24px', background: theme.input, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText }}><User size={14} /></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <AnimatePresence>
                                {showNav && (
                                    <motion.div
                                        initial={{ opacity: 0, width: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, width: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, width: 0, scale: 0.8 }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}
                                    >
                                        {/* Eco-Points Badge */}
                                        <motion.div title="Eco-Points: 5 points = 1.2kg CO2 Saved!" style={{ background: isOnLeave ? theme.card : '#dcfce7', padding: '6px 12px', borderRadius: '20px', border: `1px solid ${isOnLeave ? theme.border : '#86efac'}`, color: isOnLeave ? theme.subText : '#166534', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                            <span>🌱</span> {regForm.ecoPoints || 0}
                                        </motion.div>

                                        <motion.button title="Help & Support" onClick={() => setShowSupport(true)} whileTap={{ scale: 0.9 }} style={{ background: theme.card, padding: '10px', borderRadius: '50%', border: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.highlight }}>
                                            <HelpCircle size={20} />
                                        </motion.button>
                                        <motion.button title="Lost & Found" onClick={() => setShowLostFound(true)} whileTap={{ scale: 0.9 }} style={{ background: theme.card, padding: '10px', borderRadius: '50%', border: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.highlight }}>
                                            <Search size={20} />
                                        </motion.button>
                                        <motion.button title="Toggle Theme" onClick={toggleTheme} whileTap={{ scale: 0.9 }} style={{ background: theme.card, padding: '10px', borderRadius: '50%', border: `1px solid ${theme.border}`, cursor: 'pointer', color: theme.text }}>
                                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                                        </motion.button>
                                        {/* Notification Bell */}
                                        <motion.button title="Notifications" onClick={() => setShowNotificationCenter(true)} whileTap={{ scale: 0.9 }} style={{ position: 'relative', background: theme.card, padding: '10px', borderRadius: '50%', border: `1px solid ${theme.border}`, cursor: 'pointer', color: unreadNotifications > 0 ? '#f59e0b' : theme.highlight }}>
                                            <Bell size={20} />
                                            {unreadNotifications > 0 && (
                                                <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                                </div>
                                            )}
                                        </motion.button>

                                        <motion.button onClick={() => setShowBusPass(true)} whileTap={{ scale: 0.9 }} title="Digital Bus Pass" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', padding: '10px', borderRadius: '50%', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '16px' }}>🪪</span>
                                        </motion.button>
                                        <motion.button onClick={() => setShowLeave(true)} whileTap={{ scale: 0.9 }} title="Leave Application" style={{ background: isOnLeave ? '#fee2e2' : theme.card, padding: '10px', borderRadius: '50%', border: `1px solid ${isOnLeave ? '#fca5a5' : theme.border}`, cursor: 'pointer', color: isOnLeave ? '#ef4444' : theme.highlight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '16px' }}>🏖️</span>
                                        </motion.button>
                                        {!trackingBus ? (
                                            <motion.button whileTap={{ scale: 0.95 }} style={{ borderRadius: '14px', padding: '10px 20px', fontSize: '14px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', whiteSpace: 'nowrap' }} onClick={() => router.push('/scan')}>Scan QR</motion.button>
                                        ) : (
                                            <motion.button whileTap={{ scale: 0.95 }} style={{ background: 'rgba(254, 226, 226, 0.5)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }} onClick={() => { setTrackingBus(null); router.push('/dashboard'); }}>Exit</motion.button>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                onClick={() => setShowNav(!showNav)}
                                whileTap={{ scale: 0.9 }}
                                title="Toggle Menu"
                                style={{
                                    background: showNav ? theme.card : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    padding: '10px',
                                    borderRadius: '50%',
                                    border: showNav ? `1px solid ${theme.border}` : 'none',
                                    cursor: 'pointer',
                                    color: showNav ? theme.highlight : 'white',
                                    boxShadow: showNav ? 'none' : '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                {showNav ? <X size={20} /> : <Menu size={20} />}
                            </motion.button>
                        </div>
                    </div>

                    {/* Announcement Banner */}
                    <AnimatePresence>
                        {announcement && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ background: '#fff7ed', borderBottom: '1px solid #ffedd5', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: '#9a3412', fontWeight: '600', zIndex: 19 }}>
                                <span>📢</span> {announcement.message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Modals (Profile, Support, Rating, Route Info, Registration, Lost&Found) */}
                    <AnimatePresence>
                        {(showProfile || showSupport || showRating || showRouteInfo || showRegistration || showLostFound || showLeave || showBusPass) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => { setShowProfile(false); setShowSupport(false); setShowRouteInfo(false); setShowLostFound(false); setShowLeave(false); setShowBusPass(false); }}>

                                {/* Digital ID Card Modal (Replaces Profile) */}
                                {showProfile && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '320px', background: theme.card, borderRadius: '24px', padding: '24px', textAlign: 'center', color: theme.text }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ width: '80px', height: '80px', background: theme.input, borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subText }}>
                                                <User size={40} />
                                            </div>
                                            {isSavingName ? (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <input value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${theme.border}`, width: '140px', background: theme.input, color: theme.text }} />
                                                    <button onClick={handleUpdateName} style={{ padding: '8px 12px', background: '#10b981', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Save</button>
                                                </div>
                                            ) : (
                                                <h2 onClick={() => setIsSavingName(true)} style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    {user.displayName} <Edit size={14} color={theme.subText} />
                                                </h2>
                                            )}
                                            <p style={{ margin: '4px 0 0', color: theme.subText, fontSize: '14px' }}>{user.email}</p>
                                        </div>
                                        <div style={{ textAlign: 'left', background: theme.input, padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                                            <p style={{ margin: '0 0 8px', fontSize: '13px', color: theme.subText, fontWeight: 'bold', textTransform: 'uppercase' }}>Bus Details</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span>Bus Number</span>
                                                <span style={{ fontWeight: 'bold' }}>{regForm.busNumber || 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span>Department</span>
                                                <span style={{ fontWeight: 'bold' }}>{regForm.department || 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '8px' }}>
                                                <span>Eco-Points 🌱</span>
                                                <span style={{ fontWeight: 'bold', color: '#10b981' }}>{regForm.ecoPoints || 0} pts</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <button onClick={() => setShowRegistration(true)} style={{ padding: '12px', background: theme.input, color: theme.text, borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Edit Registration</button>
                                            <button onClick={handleLogout} style={{ padding: '12px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Sign Out</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Support Modal */}
                                {showSupport && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '360px', background: theme.card, borderRadius: '24px', padding: '24px', position: 'relative', color: theme.text }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Contact Support</h2>
                                            <button onClick={() => setShowSupport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText }}><X size={20} /></button>
                                        </div>

                                        <select
                                            value={queryBus}
                                            onChange={(e) => setQueryBus(e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.input, fontSize: '15px', fontWeight: '500', outline: 'none', marginBottom: '12px', color: theme.text }}
                                        >
                                            <option value="">Select Related Bus (Optional)</option>
                                            {Object.keys(allRoutes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(num => (<option key={num} value={num}>Bus {num}</option>))}
                                        </select>

                                        <textarea
                                            value={queryText}
                                            onChange={e => setQueryText(e.target.value)}
                                            placeholder="Describe your issue..."
                                            style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.input, fontSize: '15px', resize: 'none', marginBottom: '16px', outline: 'none', color: theme.text }}
                                        ></textarea>
                                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleSubmitQuery} style={{ width: '100%', padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>Submit Query</motion.button>
                                    </motion.div>
                                )}

                                {/* Route Info Modal */}
                                {showRouteInfo && currentRoute && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '360px', background: theme.card, borderRadius: '24px', padding: '24px', position: 'relative', color: theme.text, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Route Schedule</h2>
                                            <button onClick={() => setShowRouteInfo(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText }}><X size={20} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {currentRoute.stops.map((stop, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ padding: '8px', background: i === 0 || i === currentRoute.stops.length - 1 ? theme.highlight : theme.input, borderRadius: '50%', color: i === 0 || i === currentRoute.stops.length - 1 ? 'white' : theme.text, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{i + 1}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{stop.name}</div>
                                                        <div style={{ fontSize: '12px', color: theme.subText }}>{stop.time || 'Flexible'}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Leave Rating Modal code mostly as-is but with theme */}
                                {showRating && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '360px', background: theme.card, borderRadius: '24px', padding: '32px', textAlign: 'center', color: theme.text }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Safe Drop-off Confirmed</h2>
                                        <p style={{ color: theme.subText, marginBottom: '24px' }}>How was your trip?</p>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <motion.button key={star} onClick={() => setRating(star)} style={{ background: 'none', border: 'none', fontSize: '32px', cursor: 'pointer', opacity: star <= rating ? 1 : 0.3 }}>⭐</motion.button>
                                            ))}
                                        </div>
                                        <input value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Any comments?" style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '24px', fontSize: '14px', outline: 'none', background: theme.input, color: theme.text }} />
                                        <motion.button onClick={submitRatingAndDropOff} style={{ width: '100%', padding: '16px', background: '#10b981', color: 'white', borderRadius: '16px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Submit & Finish</motion.button>
                                    </motion.div>
                                )}

                                {/* Registration Modal */}
                                {showRegistration && (
                                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '100%', maxWidth: '500px', background: 'white', borderRadius: '24px', padding: '32px', color: '#1e293b', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>{regForm.name ? '✏️' : '📝'}</div>
                                            <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                                                {regForm.name ? 'Edit Registration' : 'Student Registration'}
                                            </h2>
                                            <p style={{ color: '#64748b', marginTop: '8px' }}>
                                                {regForm.name ? 'Update your profile details below.' : 'Please complete your profile to continue.'}
                                            </p>
                                        </div>
                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Full Name *</label>
                                                <input value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px' }} placeholder="John Doe" />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Department *</label>
                                                    <input value={regForm.department} onChange={e => setRegForm({ ...regForm, department: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px' }} placeholder="CSE" />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Year *</label>
                                                    <select value={regForm.year} onChange={e => setRegForm({ ...regForm, year: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', background: 'white' }}>
                                                        <option value="">Select Year</option>
                                                        <option value="1">1st Year</option>
                                                        <option value="2">2nd Year</option>
                                                        <option value="3">3rd Year</option>
                                                        <option value="4">4th Year</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Bus Number *</label>
                                                <select value={regForm.busNumber} onChange={e => setRegForm({ ...regForm, busNumber: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', background: 'white' }}>
                                                    <option value="">Select Bus</option>
                                                    {Object.keys(allRoutes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(num => (<option key={num} value={num}>{num}</option>))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Stop Name</label>
                                                <select
                                                    value={regForm.stopName}
                                                    onChange={e => setRegForm({ ...regForm, stopName: e.target.value })}
                                                    disabled={!regForm.busNumber}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', background: !regForm.busNumber ? '#f1f5f9' : 'white', cursor: !regForm.busNumber ? 'not-allowed' : 'pointer', color: '#000000' }}
                                                >
                                                    <option value="" style={{ color: '#000000', background: 'white' }}>{regForm.busNumber ? "Select Stop" : "Select Bus First"}</option>
                                                    {regForm.busNumber && allRoutes[regForm.busNumber] && allRoutes[regForm.busNumber].stops && allRoutes[regForm.busNumber].stops.map((stop, i) => {
                                                        const stopName = typeof stop === 'object' ? stop.name : stop;
                                                        return (
                                                            <option key={i} value={stopName} style={{ color: '#000000', background: 'white' }}>{stopName}</option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Phone Number *</label>
                                                <input value={regForm.phoneNumber} onChange={e => setRegForm({ ...regForm, phoneNumber: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px' }} placeholder="e.g. 9876543210" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Parent's Phone Number</label>
                                                <input value={regForm.parentPhoneNumber} onChange={e => setRegForm({ ...regForm, parentPhoneNumber: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px' }} placeholder="e.g. 9876543210" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '6px' }}>Address</label>
                                                <textarea value={regForm.address} onChange={e => setRegForm({ ...regForm, address: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', resize: 'none', height: '80px' }} placeholder="Your full address..." />
                                            </div>

                                            <button onClick={handleRegister} style={{ marginTop: '10px', width: '100%', padding: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}>
                                                {regForm.name ? 'Update Profile ✅' : 'Complete Registration 🚀'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Leave Application Modal */}
                                {showLeave && user && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '360px', background: theme.card, borderRadius: '24px', padding: '28px', position: 'relative', color: theme.text }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>🏖️ Leave Application</h2>
                                            <button onClick={() => setShowLeave(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText }}><X size={20} /></button>
                                        </div>
                                        {isOnLeave ? (
                                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                                <div style={{ fontSize: '60px', marginBottom: '16px' }}>✅</div>
                                                <h3 style={{ margin: '0 0 8px', color: '#059669' }}>Leave Marked for Today</h3>
                                                <p style={{ color: theme.subText, marginBottom: '24px' }}>Your driver has been notified that you won't be boarding today. Stay safe!</p>
                                                <button
                                                    onClick={async () => {
                                                        setLeaveLoading(true);
                                                        try {
                                                            const db = getFirestore();
                                                            const today = new Date().toLocaleDateString('en-CA');
                                                            const q = query(collection(db, 'leave_requests'), where('studentId', '==', user.uid), where('date', '==', today));
                                                            const snap = await getDocs(q);
                                                            for (const d of snap.docs) await deleteDoc(d.ref);
                                                            setIsOnLeave(false);
                                                            setShowLeave(false);
                                                        } catch (e) { alert(e.message); }
                                                        setLeaveLoading(false);
                                                    }}
                                                    disabled={leaveLoading}
                                                    style={{ padding: '12px 24px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >Cancel Leave</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ background: isOnLeave ? '#f0fdf4' : '#fef9c3', border: `1px solid ${isOnLeave ? '#86efac' : '#fde047'}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                                    <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>🚌 Marking leave will notify your driver (<strong>Bus {regForm.busNumber || '?'}</strong>) that you won't be at <strong>{regForm.stopName || 'your stop'}</strong> today.</p>
                                                </div>
                                                <div style={{ marginBottom: '16px' }}>
                                                    <p style={{ margin: '0 0 4px', fontSize: '13px', color: theme.subText }}>Today's Date</p>
                                                    <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        if (!regForm.busNumber) return alert('Please complete your registration (Bus Number) first.');
                                                        setLeaveLoading(true);
                                                        try {
                                                            const db = getFirestore();
                                                            await addDoc(collection(db, 'leave_requests'), {
                                                                studentId: user.uid,
                                                                studentName: user.displayName || regForm.name || 'Student',
                                                                busNumber: regForm.busNumber,
                                                                stopName: regForm.stopName || '',
                                                                date: new Date().toLocaleDateString('en-CA'),
                                                                status: 'pending',
                                                                createdAt: serverTimestamp()
                                                            });
                                                            setIsOnLeave(true);
                                                            setShowLeave(false);
                                                            alert('✅ Leave submitted! Your driver has been notified.');
                                                        } catch (e) { alert(e.message); }
                                                        setLeaveLoading(false);
                                                    }}
                                                    disabled={leaveLoading}
                                                    style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold', fontSize: '16px', cursor: leaveLoading ? 'not-allowed' : 'pointer' }}
                                                >
                                                    {leaveLoading ? 'Submitting...' : '🏖️ Mark Absent for Today'}
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Digital Bus Pass Modal */}
                                {showBusPass && user && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
                                        {/* Card Front */}
                                        <div style={{
                                            background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #0ea5e9 100%)',
                                            borderRadius: '24px',
                                            padding: '28px',
                                            color: 'white',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
                                        }}>
                                            {/* Background Decoration */}
                                            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                                            <div style={{ position: 'absolute', bottom: '-20px', left: '-30px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />

                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '10px', letterSpacing: '2px', opacity: 0.7 }}>TRANS-IT SYSTEM</p>
                                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Digital Bus Pass</p>
                                                </div>
                                                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🚌</div>
                                            </div>

                                            {/* Student Info */}
                                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                                                <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>👤</div>
                                                <div>
                                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{user.displayName || regForm.name || 'Student'}</h2>
                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>{regForm.department || 'N/A'} • {regForm.year ? `Year ${regForm.year}` : 'N/A'}</p>
                                                </div>
                                            </div>

                                            {/* Bus & Stop */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
                                                    <p style={{ margin: 0, fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>BUS NUMBER</p>
                                                    <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 'bold' }}>{regForm.busNumber || '?'}</p>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
                                                    <p style={{ margin: 0, fontSize: '10px', opacity: 0.7, letterSpacing: '1px' }}>BOARDING STOP</p>
                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', fontWeight: 'bold', lineHeight: '1.3' }}>{regForm.stopName || 'Not Set'}</p>
                                                </div>
                                            </div>

                                            {/* Status / Leave Badge */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '8px', height: '8px', background: isOnLeave ? '#fbbf24' : '#34d399', borderRadius: '50%', boxShadow: `0 0 8px ${isOnLeave ? '#fbbf24' : '#34d399'}` }} />
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{isOnLeave ? 'ON LEAVE TODAY' : 'ACTIVE'}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '11px', opacity: 0.6 }}>Valid: AY 2025-26</p>
                                            </div>

                                            {/* Barcode-style decoration */}
                                            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', opacity: 0.5 }}>
                                                <span>{user.uid?.slice(0, 8).toUpperCase()}</span>
                                                <span>{'|'.repeat(30)}</span>
                                                <span>SRM</span>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowBusPass(false)} style={{ width: '100%', marginTop: '16px', padding: '14px', background: 'white', color: '#1e293b', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>Close</button>
                                    </motion.div>
                                )}

                                {/* Lost & Found Modal */}
                                {showLostFound && (
                                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: '360px', background: theme.card, borderRadius: '24px', padding: '24px', position: 'relative', color: theme.text, maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Lost & Found</h2>
                                            <button onClick={() => setShowLostFound(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText }}><X size={20} /></button>
                                        </div>
                                        <div style={{ marginBottom: '20px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.subText, textTransform: 'uppercase', marginBottom: '10px' }}>Report Lost Item</h3>
                                            <form onSubmit={handleReportLost} style={{ display: 'grid', gap: '10px' }}>
                                                <input
                                                    value={lostItemForm.item} onChange={e => setLostItemForm({ ...lostItemForm, item: e.target.value })}
                                                    placeholder="Item Name (e.g. Blue Umbrella)" required
                                                    style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }}
                                                />
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <select
                                                        value={lostItemForm.bus} onChange={e => setLostItemForm({ ...lostItemForm, bus: e.target.value })}
                                                        style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.input, color: theme.text }} required
                                                    >
                                                        <option value="">Select Bus</option>
                                                        {Object.keys(allRoutes).map(b => <option key={b} value={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <textarea
                                                    value={lostItemForm.desc} onChange={e => setLostItemForm({ ...lostItemForm, desc: e.target.value })}
                                                    placeholder="Description (Location, time, etc.)" required
                                                    style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.input, color: theme.text, height: '80px', resize: 'none' }}
                                                />
                                                <button type="submit" style={{ padding: '12px', background: '#ef4444', color: 'white', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Report Lost</button>
                                            </form>
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.subText, textTransform: 'uppercase', marginBottom: '10px' }}>Found Items</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {lostFoundItems.filter(i => i.type === 'found' && i.status !== 'returned').length === 0 && <p style={{ fontSize: '13px', color: theme.subText }}>No found items posted recently.</p>}
                                                {lostFoundItems.filter(i => i.type === 'found' && i.status !== 'returned').map(item => (
                                                    <div key={item.id} style={{ padding: '12px', background: theme.input, borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{item.itemName}</p>
                                                                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: theme.subText }}>{item.description}</p>
                                                                <p style={{ margin: 0, fontSize: '11px', color: theme.highlight, fontWeight: 'bold' }}>Found in Bus {item.busNumber}</p>
                                                            </div>
                                                            <span style={{ fontSize: '20px' }}>📦</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: theme.subText, textTransform: 'uppercase', marginBottom: '10px', marginTop: '20px' }}>My Reports</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {lostFoundItems.filter(i => i.studentId === user?.uid).map(item => (
                                                    <div key={item.id} style={{ padding: '12px', background: theme.input, borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{item.itemName}</p>
                                                                <p style={{ margin: 0, fontSize: '11px', color: item.status === 'returned' || item.status === 'resolved' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{item.status.toUpperCase()}</p>
                                                            </div>
                                                            <button onClick={() => handleDeleteReport(item.id)} style={{ padding: '4px 8px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Del</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content Area */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
                            {!trackingBus ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <AnimatePresence>
                                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ padding: '40px', borderRadius: '40px', textAlign: 'center', width: '380px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', background: darkMode ? 'rgba(30, 41, 59, 0.65)' : 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(24px)', border: `1px solid ${theme.border}` }}>
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1.2 }} style={{ fontSize: '64px', marginBottom: '16px', display: 'inline-block' }}>🚌</motion.div>
                                            <h2 style={{ color: theme.text, marginBottom: '8px', fontWeight: '800', fontSize: '28px', letterSpacing: '-1px' }}>Find Your Bus</h2>
                                            <p style={{ color: theme.subText, marginBottom: '32px', fontSize: '16px', lineHeight: '1.5' }}>Enter your bus number to start<br />tracking in real-time.</p>

                                            <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <select value={busNumber} onChange={(e) => setBusNumber(e.target.value)} style={{ width: '100%', padding: '18px', borderRadius: '20px', border: '2px solid transparent', appearance: 'none', background: theme.input, color: theme.text, fontSize: '17px', fontWeight: '600', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', outline: 'none', transition: 'all 0.2s', cursor: 'pointer' }}>
                                                        <option value="" disabled>Select Bus Number</option>
                                                        {Object.keys(allRoutes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).map(num => (<option key={num} value={num}>{num}</option>))}
                                                    </select>
                                                </div>

                                                {/* Dynamic Stop Selection based on Bus */}
                                                {busNumber && allRoutes[busNumber] && allRoutes[busNumber].stops && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ position: 'relative' }}>
                                                        <select
                                                            onChange={(e) => {
                                                                const selectedName = e.target.value;
                                                                const stop = allRoutes[busNumber].stops.find(s => (typeof s === 'object' ? s.name : s) === selectedName);
                                                                setSelectedStop(typeof stop === 'string' ? { name: stop } : stop);
                                                            }}
                                                            style={{ width: '100%', padding: '18px', borderRadius: '20px', border: '2px solid transparent', appearance: 'none', background: theme.input, color: theme.text, fontSize: '17px', fontWeight: '600', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)', outline: 'none', transition: 'all 0.2s', cursor: 'pointer' }}
                                                        >
                                                            <option value="" disabled selected style={{ color: '#000000', background: 'white' }}>Select Boarding Point</option>
                                                            {allRoutes[busNumber].stops.map((stop, i) => {
                                                                const stopName = typeof stop === 'object' ? stop.name : stop;
                                                                return (
                                                                    <option key={i} value={stopName} style={{ color: '#000000', background: 'white' }}>{stopName}</option>
                                                                );
                                                            })}
                                                        </select>
                                                    </motion.div>
                                                )}

                                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={!busNumber} style={{ padding: '18px', borderRadius: '20px', cursor: busNumber ? 'pointer' : 'not-allowed', background: busNumber ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : theme.border, color: busNumber ? 'white' : theme.subText, border: 'none', fontWeight: '800', fontSize: '17px', boxShadow: busNumber ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' : 'none', transition: 'background 0.3s' }}>Start Tracking</motion.button>
                                            </form>

                                            {/* Favorites / Recents */}
                                            {favorites.length > 0 && (
                                                <div style={{ marginTop: '24px', textAlign: 'left' }}>
                                                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: theme.subText, textTransform: 'uppercase', marginBottom: '8px' }}>Recent Routes</p>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {favorites.map(fav => (
                                                            <motion.button key={fav} whileHover={{ scale: 1.1 }} onClick={() => setTrackingBus(fav)} style={{ padding: '8px 16px', borderRadius: '12px', background: theme.input, border: `1px solid ${theme.border}`, color: theme.highlight, fontWeight: 'bold', cursor: 'pointer' }}>
                                                                Bus {fav}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div style={{ height: '100%', width: '100%', filter: darkMode ? 'invert(1) hue-rotate(180deg) contrast(0.8)' : 'none', transition: 'filter 0.5s' }}>
                                    <Map busLocation={busLocation} busNumber={trackingBus} destination={isBoarded ? SRM_COORDS : (selectedStop || null)} userLocation={selectedStop?.lat ? selectedStop : userLocation} stops={currentStops} />
                                </div>
                            )}
                        </div>

                        {/* Tracking View Overlay */}
                        <AnimatePresence>
                            {trackingBus && (
                                <motion.div initial={{ y: "110%" }} animate={{ y: 0 }} exit={{ y: "110%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} style={{ position: 'absolute', bottom: '24px', left: '20px', right: '20px', background: darkMode ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(24px)', borderRadius: '36px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', zIndex: 10, border: `1px solid ${theme.border}`, maxHeight: '60vh', overflowY: 'auto', color: theme.text }}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Bus {trackingBus}</h2>
                                            {busDelay && (
                                                <div style={{ background: '#ef4444', color: 'white', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    Delayed: {busDelay.reason}
                                                </div>
                                            )}
                                            <button onClick={() => toggleFavorite(trackingBus)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: favorites.includes(trackingBus) ? '#f59e0b' : theme.subText }}><Star fill={favorites.includes(trackingBus) ? '#f59e0b' : 'none'} size={24} /></button>
                                        </div>
                                        <button onClick={() => setShowRouteInfo(true)} style={{ background: theme.input, padding: '8px 16px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: 'bold', color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Info size={14} /> Schedule
                                        </button>
                                    </div>

                                    {/* Seat Availability Bar */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.subText }}>
                                            <span>Occupancy</span>
                                            <span style={{ color: getOccupancyColor() }}>{seatPercentage}% Full</span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: theme.input, borderRadius: '4px', overflow: 'hidden' }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${seatPercentage}%` }} style={{ height: '100%', background: getOccupancyColor(), borderRadius: '4px' }} />
                                        </div>
                                        <div style={{ fontSize: '12px', marginTop: '4px', color: theme.subText, textAlign: 'right' }}>Approx. {seatsLeft} seats left</div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                        <motion.div whileHover={{ y: -2 }} style={{ padding: '16px', background: theme.card, borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: `1px solid ${theme.border}`, position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9333ea', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}> <LayoutDashboard size={14} /> Speed </div>
                                            <div style={{ fontSize: '26px', fontWeight: '800', color: theme.text }}> {busLocation?.speed ? Math.round(busLocation.speed) : 0} <span style={{ fontSize: '14px', color: theme.subText, fontWeight: '600' }}>km/h</span> </div>
                                        </motion.div>
                                        <motion.div whileHover={{ y: -2 }} style={{ padding: '16px', background: theme.card, borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: `1px solid ${theme.border}`, position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ea580c', fontSize: '12px', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}> <Clock size={14} /> ETA </div>
                                            <div style={{ fontSize: '26px', fontWeight: '800', color: theme.text }}> {routeStats.duration || '--'} <span style={{ fontSize: '14px', color: theme.subText, fontWeight: '600' }}>min</span> </div>
                                        </motion.div>
                                    </div>

                                    {isBoarded ? (
                                        <motion.button whileHover={{ scale: 1.02 }} onClick={handleDropOff} style={{ width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', padding: '18px', borderRadius: '24px', border: 'none', fontSize: '17px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <ShieldCheck size={20} /> Confirm Safe Drop-off
                                        </motion.button>
                                    ) : (
                                        <motion.button whileHover={{ scale: 1.02 }} onClick={() => router.push(`/scan`)} style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: 'white', padding: '18px', borderRadius: '24px', border: 'none', fontSize: '17px', fontWeight: '700', cursor: 'pointer' }}>Board This Bus</motion.button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* SOS Button */}
                    <motion.button onClick={handleSOS} style={{ position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444', color: 'white', border: '4px solid #fecaca', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'pointer' }}>
                        <AlertTriangle size={32} />
                    </motion.button>

                    {/* Notification Center */}
                    <AnimatePresence>
                        {showNotificationCenter && (
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '360px', background: theme.card, zIndex: 1200, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Notifications</h2>
                                    <button onClick={() => setShowNotificationCenter(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subText }}><X size={24} /></button>
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {delayNotifications.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: theme.subText, marginTop: '40px' }}>
                                            <div style={{ background: theme.input, width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Bell size={24} /></div>
                                            <p>No notifications yet</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {delayNotifications.map(notif => (
                                                <div key={notif.id} onClick={() => markNotificationAsRead(notif.id)} style={{ padding: '16px', background: theme.input, borderRadius: '16px', borderLeft: `4px solid ${notif.type === 'DELAY_REPORT' ? '#f59e0b' : '#3b82f6'}`, opacity: notif.readBy?.includes(user?.uid) ? 0.6 : 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.subText }}>Bus {notif.busNumber}</span>
                                                        <span style={{ fontSize: '11px', color: theme.subText }}>{new Date(notif.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{notif.reason || 'Delay reported'}</p>
                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.subText }}>Reported by {notif.driverName}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Proximity Alert Banner */}
                    <AnimatePresence>
                        {proximityAlert && (
                            <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }} style={{ position: 'fixed', top: '20px', left: '20px', right: '20px', zIndex: 1100, background: 'rgba(16, 185, 129, 0.9)', backdropFilter: 'blur(10px)', color: 'white', padding: '16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}>
                                <div style={{ background: 'white', color: '#10b981', borderRadius: '50%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MapPin size={24} /></div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Bus Arriving Soon!</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '13px', opacity: 0.9 }}>Bus is {proximityAlert.distance}km away from {proximityAlert.stopName}</p>
                                </div>
                                <button onClick={() => setProximityAlert(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </>
            )}

            {/* FORCE SELECT OPTIONS VISIBILITY */}
            <style jsx global>{`
                select, select option {
                    background-color: ${darkMode ? '#1e293b' : '#ffffff'} !important;
                    color: ${darkMode ? '#f8fafc' : '#0f172a'} !important;
                }
                /* Ensure dropdown menu background is consistent */
                select:focus {
                    background-color: ${darkMode ? '#1e293b' : '#ffffff'} !important;
                    color: ${darkMode ? '#f8fafc' : '#0f172a'} !important;
                }
            `}</style>
        </div>
    );
}
