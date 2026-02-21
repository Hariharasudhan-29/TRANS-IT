import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, getDocs, serverTimestamp, onSnapshot, collection, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import AnalogSpeedometer from '../components/AnalogSpeedometer';
import SlideButton from '../components/SlideButton';
import PreTripModal from '../components/PreTripModal';
import { BUS_ROUTES } from '../../student/data/busRoutes';
import dynamic from 'next/dynamic';

const DriverMap = dynamic(() => import('../components/DriverMap'), { ssr: false });
const BreakdownMap = dynamic(() => import('../components/BreakdownMap'), { ssr: false });

export default function DriverDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [customRoutes, setCustomRoutes] = useState({});

    // Feature States
    const [darkMode, setDarkMode] = useState(false);
    const [viewMode, setViewMode] = useState('speed'); // 'speed' or 'map'
    const [showChecklist, setShowChecklist] = useState(false);
    const [breakdownMode, setBreakdownMode] = useState(false);

    useEffect(() => {
        initFirebase();
        const db = getFirestore();
        const unsub = onSnapshot(collection(db, 'routes'), (snap) => {
            const data = {};
            snap.forEach(d => data[d.id] = d.data());
            setCustomRoutes(data);
        });
        return () => unsub();
    }, []);

    const [speed, setSpeed] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showPassengers, setShowPassengers] = useState(false);
    const [busNumber, setBusNumber] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [currentLocation, setCurrentLocation] = useState(null);

    const [gpsFix, setGpsFix] = useState(false);
    const [unavailableBuses, setUnavailableBuses] = useState([]);
    const watchId = useRef(null);
    const [db, setDb] = useState(null);
    const [passengers, setPassengers] = useState([]);

    // Delay Reporting
    const [showDelayModal, setShowDelayModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [showFoundModal, setShowFoundModal] = useState(false);

    // Expense Logging
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    // Leave Requests for today's trip
    const [leaveRequests, setLeaveRequests] = useState([]);

    // Feature 1: Stop Roster — registered students per stop for this bus
    const [stopRoster, setStopRoster] = useState([]);

    // Feature 2: My Performance
    const [showPerformance, setShowPerformance] = useState(false);
    const [myFeedbacks, setMyFeedbacks] = useState([]);
    const [myTrips, setMyTrips] = useState([]);

    // Feature 3: Quick Alert
    const [showQuickAlert, setShowQuickAlert] = useState(false);
    const [quickAlertSending, setQuickAlertSending] = useState(false);

    // Feature 4: Weather
    const [weather, setWeather] = useState(null);

    // Manual Stop State
    const [currentStopIndex, setCurrentStopIndex] = useState(0);

    // Reset loop
    useEffect(() => {
        if (isActive) setCurrentStopIndex(0);
    }, [isActive]);

    const handleReportDelay = async (reason) => {
        if (!busNumber || !db) return;
        try {
            await addDoc(collection(db, 'admin_notifications'), {
                type: 'DELAY_REPORT',
                busNumber: busNumber,
                driverName: user?.displayName || 'Driver',
                reason: reason,
                timestamp: serverTimestamp(),
                status: 'pending'
            });
            await setDoc(doc(db, 'tracking', busNumber), {
                status: 'Delayed',
                delayReason: reason
            }, { merge: true });

            setShowDelayModal(false);
            alert(`Delay reported: ${reason}`);
        } catch (e) {
            console.error(e);
            alert("Failed to report delay");
        }
    };

    const handleReportMaintenance = async (issue) => {
        if (!busNumber || !db) return;
        try {
            await addDoc(collection(db, 'maintenance_requests'), {
                busNumber: busNumber,
                driverName: user?.displayName || 'Driver',
                issue: issue,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setShowMaintenanceModal(false);
            alert("Maintenance request sent.");
        } catch (e) { alert(e.message); }
    };

    const handleReportFoundItem = async (item, description) => {
        if (!busNumber || !db) return;
        try {
            await addDoc(collection(db, 'lost_found'), {
                type: 'found',
                busNumber: busNumber,
                itemName: item,
                description: description,
                finderName: user?.displayName || 'Driver',
                status: 'reported',
                createdAt: serverTimestamp()
            });
            setShowFoundModal(false);
            alert("Found item reported.");
        } catch (e) { alert(e.message); }
    };

    const handleReportExpense = async (type, amount, desc) => {
        if (!busNumber || !db) return;
        try {
            await addDoc(collection(db, 'driver_expenses'), {
                busNumber: busNumber,
                driverName: user?.displayName || 'Driver',
                type: type,
                amount: Number(amount),
                description: desc,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setShowExpenseModal(false);
            alert("Expense logged successfully!");
        } catch (e) { alert(e.message); }
    };

    // Derived State
    const currentRoute = useMemo(() => {
        if (!busNumber) return null;
        const staticRoute = BUS_ROUTES[busNumber];
        const dynamicRoute = customRoutes[busNumber];

        let stops = [];
        if (dynamicRoute && dynamicRoute.stops && dynamicRoute.stops.length > 0) {
            // If dynamic stops are strings, try to map them to static data if available, or just use names
            stops = dynamicRoute.stops.map(s => typeof s === 'string' ? { name: s, lat: null, lng: null } : s);
        } else if (staticRoute) {
            stops = staticRoute.stops;
        }

        return { ...staticRoute, ...dynamicRoute, stops };
    }, [busNumber, customRoutes]);

    // Next Stop Logic (Manual)
    const nextStop = useMemo(() => {
        if (!currentRoute || !currentRoute.stops) return null;
        if (currentStopIndex >= currentRoute.stops.length) return { name: '🏁 End of Route' };
        return currentRoute.stops[currentStopIndex];
    }, [currentRoute, currentStopIndex]);

    const handleNextStop = async () => {
        if (!currentRoute || !currentRoute.stops) return;
        const newIndex = currentStopIndex + 1;
        setCurrentStopIndex(newIndex);

        // Auto-update Firestore
        try {
            if (db && busNumber) {
                const nextName = currentRoute.stops[newIndex]?.name || 'End of Route';
                await setDoc(doc(db, 'tracking', busNumber.trim()), { nextStop: nextName }, { merge: true });
            }
        } catch (e) { console.error("Err updating stop:", e); }
    };

    // Speed Limit Warning
    const isSpeeding = speed > 80;

    useEffect(() => {
        if (!db || !busNumber || !user) return;
        const sanitizedBus = busNumber.trim();
        const driverName = user.displayName || user.email || 'Driver';

        // Reset active status when selecting a bus. 
        // Trip must be explicitly started to become active.
        if (!isActive) {
            setDoc(doc(db, 'tracking', sanitizedBus), {
                driverName,
                active: false
            }, { merge: true });
        } else {
            setDoc(doc(db, 'tracking', sanitizedBus), { driverName }, { merge: true });
        }

        const q = query(
            collection(db, 'boardings'),
            where('busNumber', '==', sanitizedBus),
            where('status', '==', 'Boarded')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().studentName || 'Student',
                status: 'Boarded'
            }));
            setPassengers(list);
            setDoc(doc(db, 'tracking', sanitizedBus), {
                passengerCount: list.length,
                lastUpdated: serverTimestamp()
            }, { merge: true }).catch(console.error);
        });
        return () => unsubscribe();
    }, [db, busNumber, user]);

    // Real-time leave requests for this bus today
    useEffect(() => {
        if (!db || !busNumber) { setLeaveRequests([]); return; }
        const today = new Date().toLocaleDateString('en-CA');
        const q = query(
            collection(db, 'leave_requests'),
            where('busNumber', '==', busNumber.trim()),
            where('date', '==', today)
        );
        const unsub = onSnapshot(q, (snap) => {
            setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, busNumber]);

    // Feature 1: Stop Roster — all students registered to this bus
    useEffect(() => {
        if (!db || !busNumber) { setStopRoster([]); return; }
        const q = query(collection(db, 'users'), where('busNumber', '==', busNumber.trim()));
        const unsub = onSnapshot(q, (snap) => {
            setStopRoster(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, busNumber]);

    // Feature 2: My Performance — feedback + trip history
    useEffect(() => {
        if (!db || !user || !busNumber) return;
        const qFb = query(collection(db, 'feedback'), where('busNumber', '==', busNumber));
        const unsubFb = onSnapshot(qFb, snap => setMyFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const qTrips = query(collection(db, 'trip_logs'), where('driverId', '==', user.uid));
        const unsubTrips = onSnapshot(qTrips, snap => setMyTrips(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubFb(); unsubTrips(); };
    }, [db, user, busNumber]);

    // Feature 4: Weather — fetch when GPS location is acquired
    useEffect(() => {
        if (!currentLocation) return;
        const fetchWeather = async () => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${currentLocation.lat}&longitude=${currentLocation.lng}&current_weather=true`);
                const data = await res.json();
                if (data.current_weather) {
                    const wc = data.current_weather.weathercode;
                    const getDesc = (c) => {
                        if (c === 0) return { label: 'Clear Sky', icon: '☀️' };
                        if (c <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
                        if (c <= 48) return { label: 'Foggy', icon: '🌫️' };
                        if (c <= 67) return { label: 'Rainy', icon: '🌧️' };
                        if (c <= 77) return { label: 'Snowy', icon: '❄️' };
                        if (c <= 82) return { label: 'Rain Showers', icon: '🌦️' };
                        return { label: 'Thunderstorm', icon: '⛈️' };
                    };
                    const desc = getDesc(wc);
                    setWeather({ temp: Math.round(data.current_weather.temperature), wind: Math.round(data.current_weather.windspeed), ...desc });
                }
            } catch (e) { console.warn('Weather fetch failed', e); }
        };
        fetchWeather();
    }, [currentLocation?.lat, currentLocation?.lng]);

    // Feature 3: Quick Alert handler
    const handleQuickAlert = async (message) => {
        if (!busNumber || !db) return;
        setQuickAlertSending(true);
        try {
            await addDoc(collection(db, 'announcements'), {
                message: `🚌 Bus ${busNumber}: ${message}`,
                createdAt: serverTimestamp(),
                active: true,
                busNumber: busNumber,
                type: 'driver_alert'
            });
            setShowQuickAlert(false);
            alert(`✅ Alert sent to all Bus ${busNumber} students!`);
        } catch (e) { alert(e.message); }
        setQuickAlertSending(false);
    };

    useEffect(() => {
        if (!db) return;
        if (!db) return;
        // OPTIMIZATION: Only listen to ACTIVE buses to reduce read quota
        const q = query(collection(db, 'tracking'), where('active', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const active = [];
            const now = Date.now();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.lastUpdated) {
                    const lastUpdate = data.lastUpdated.seconds ? data.lastUpdated.seconds * 1000 : data.lastUpdated.toMillis();
                    // Consider it active if updated in the last 5 minutes
                    if (now - lastUpdate < 300000) {
                        active.push({ ...data, id: doc.id, status: 'Busy' });
                    }
                }
            });
            setUnavailableBuses(active);
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        initFirebase();
        const firestore = getFirestore();
        setDb(firestore);
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (!u) {
                router.replace('/auth/signin');
            } else {
                if (u.email === 'admin@transit.com') {
                    router.replace('/admin');
                    return;
                }
                setUser(u);
                // Replace history state to prevent back button issues
                if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', '/dashboard');
                }
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isActive) {
            if (!("geolocation" in navigator)) {
                alert("Geolocation is not supported.");
                return;
            }

            // Speed smoothing - keep last 3 readings for averaging
            const speedReadings = [];
            let lastUpdate = 0;

            const updateLocation = (position) => {
                setGpsFix(true);
                const { latitude, longitude, speed: gpsSpeed, heading } = position.coords;

                // Convert m/s to km/h with better accuracy
                let speedKmH = 0;

                if (gpsSpeed !== null && gpsSpeed !== undefined && gpsSpeed >= 0) {
                    speedKmH = gpsSpeed * 3.6;

                    // Add to readings for smoothing
                    speedReadings.push(speedKmH);
                    if (speedReadings.length > 3) {
                        speedReadings.shift(); // Keep only last 3 readings
                    }

                    // Calculate average speed for smoother display
                    const avgSpeed = speedReadings.reduce((a, b) => a + b, 0) / speedReadings.length;
                    speedKmH = Math.max(0, avgSpeed); // Ensure non-negative
                }

                setSpeed(Math.round(speedKmH * 10) / 10);
                setCurrentLocation({ lat: latitude, lng: longitude });

                // THROTTLE FIRESTORE WRITES: Only write once every 5 seconds
                const now = Date.now();
                if (db && busNumber && (now - lastUpdate > 5000)) {
                    lastUpdate = now;
                    const sanitizedBus = busNumber.trim();
                    setDoc(doc(db, 'tracking', sanitizedBus), {
                        lat: latitude,
                        lng: longitude,
                        speed: Math.round(speedKmH * 10) / 10,
                        heading: heading || 0,
                        busNumber: sanitizedBus,
                        active: true,
                        lastUpdated: serverTimestamp()
                    }, { merge: true }).catch(console.error);
                }
            };

            // Get initial position
            navigator.geolocation.getCurrentPosition(updateLocation, console.error, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });

            // Watch position with optimized settings
            watchId.current = navigator.geolocation.watchPosition(updateLocation, console.error, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Always get fresh reading
            });
        } else {
            if (watchId.current) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            setSpeed(0);
            setGpsFix(false);
            setCurrentLocation(null);
        }
        return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
    }, [isActive, busNumber]);

    useEffect(() => {
        let interval;
        if (isActive) interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        else setElapsedTime(0);
        return () => clearInterval(interval);
    }, [isActive]);

    useEffect(() => {
        if (!isActive || !busNumber || !db || !user) return;
        const heartbeat = setInterval(() => {
            setDoc(doc(db, 'tracking', busNumber.trim()), {
                active: true,
                lastUpdated: serverTimestamp()
            }, { merge: true }).catch(console.error);
        }, 15000);
        return () => clearInterval(heartbeat);
    }, [isActive, busNumber, user, db]);

    // Listen for admin trip abort
    useEffect(() => {
        if (!isActive || !busNumber || !db) return;

        const trackingRef = doc(db, 'tracking', busNumber.trim());
        const unsubscribe = onSnapshot(trackingRef, (snapshot) => {
            const data = snapshot.data();

            // Check if trip was aborted by admin
            if (data && data.status === 'Aborted by Admin' && data.active === false) {
                // Alert driver
                alert(`⚠️ TRIP ABORTED BY ADMIN\n\nYour trip for Bus ${busNumber} has been forcefully ended by the administrator.\n\nPlease contact admin for more information.`);

                // End the trip locally
                setIsActive(false);
                setSpeed(0);
                setElapsedTime(0);
                setCurrentStopIndex(0);

                // Clear GPS watch
                if (watchId.current) {
                    navigator.geolocation.clearWatch(watchId.current);
                    watchId.current = null;
                }
            }
        });

        return () => unsubscribe();
    }, [isActive, busNumber, db]);

    const formatTime = (secs) => {
        const mins = Math.floor(secs / 60);
        const s = secs % 60;
        return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleBeforeStart = () => {
        if (!busNumber) return alert("Select a bus first");
        setShowChecklist(true);
    };

    const confirmStartTrip = async () => {
        setShowChecklist(false);
        await toggleTrip(true);
    };

    const toggleTrip = async (forceStart = false) => {
        // If verify logic is separate, we only proceed.
        // If forceStart is true, we know checks passed.
        // If isActive is true (ending trip), we just end.

        const newState = forceStart ? true : !isActive;
        if (isActive && !forceStart) {
            // Ending trip
            setIsActive(false);
        } else if (!isActive && !forceStart) {
            // Should verify first
            handleBeforeStart();
            return;
        } else {
            // Starting trip (forceStart=true)
            setIsActive(true);
        }

        const isStarting = newState;

        if (db && busNumber) {
            const date = new Date().toISOString().split('T')[0];
            const sanitizedBus = busNumber.trim();
            const driverName = user?.displayName || user?.email || 'Unknown Driver';

            if (isStarting) {
                try {
                    const tripRef = await addDoc(collection(db, 'trip_logs'), {
                        busNumber: sanitizedBus,
                        driverId: user?.uid,
                        driverName: driverName,
                        startTime: serverTimestamp(),
                        status: 'active',
                        date: date
                    });
                    localStorage.setItem('currentTripId', tripRef.id);
                    await setDoc(doc(db, 'tracking', sanitizedBus), {
                        active: true,
                        status: 'In Transit', // Reset status to remove any 'Aborted' flags
                        lastUpdated: serverTimestamp(),
                        startTime: serverTimestamp(),
                        driverName: driverName,
                        currentTripId: tripRef.id
                    }, { merge: true });
                } catch (e) { console.error(e); }
            } else {
                try {
                    const tripId = localStorage.getItem('currentTripId');
                    if (tripId) {
                        await updateDoc(doc(db, 'trip_logs', tripId), {
                            endTime: serverTimestamp(),
                            status: 'completed'
                        });
                        localStorage.removeItem('currentTripId');
                    }
                    await setDoc(doc(db, 'tracking', sanitizedBus), {
                        active: false,
                        status: 'Trip Ended', // Clear status
                        lastUpdated: serverTimestamp(),
                        endTime: serverTimestamp()
                    }, { merge: true });
                } catch (e) { console.error(e); }
            }
        }
    };

    const handleSOS = () => {
        if (!confirm("🚨 SEND SOS ALERT?")) return;
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    await addDoc(collection(db, 'sos_alerts'), {
                        driverId: user?.uid,
                        driverName: user?.displayName || user?.email || 'Driver',
                        busNumber: busNumber || 'Unknown',
                        location: { lat: latitude, lng: longitude },
                        status: 'active',
                        createdAt: serverTimestamp(),
                        type: 'driver'
                    });
                    alert("SOS Sent!");
                } catch (e) { alert("Error sending SOS: " + e.message); }
            }, (err) => alert("GPS Error: " + err.message), { enableHighAccuracy: true });
        } else { alert("GPS not supported"); }
    };

    const handleClearPassengers = async () => {
        if (!confirm('Clear passenger list?')) return;
        try {
            const sanitizedBus = busNumber.trim();
            const q = query(collection(db, 'boardings'), where('busNumber', '==', sanitizedBus));
            const snapshot = await getDocs(q);
            const batchPromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(batchPromises);
            setDoc(doc(db, 'tracking', sanitizedBus), { passengerCount: 0, lastUpdated: serverTimestamp() }, { merge: true });
            alert('Cleared.');
            setShowPassengers(false);
        } catch (error) { alert("Failed to clear."); }
    };

    const handleLogout = async () => {
        await signOut(getAuth());
        router.push('/auth/signin');
    };

    const isMaintenance = busNumber && customRoutes[busNumber]?.status === 'maintenance';

    // Theme Colors
    const theme = darkMode ? {
        bg: '#0f172a',
        text: '#f8fafc',
        cardRg: '#1e293b',
        border: '#334155',
        subText: '#94a3b8',
        highlight: '#38bdf8'
    } : {
        bg: '#f8fafc',
        text: '#0f172a',
        cardRg: 'white',
        border: '#e2e8f0',
        subText: '#64748b',
        highlight: '#2563eb'
    };

    return (
        <div style={{ height: '100vh', background: theme.bg, display: 'flex', flexDirection: 'column', color: theme.text, transition: 'background 0.3s' }}>
            <PreTripModal isOpen={showChecklist} onClose={() => setShowChecklist(false)} onConfirm={confirmStartTrip} />

            {/* Breakdown Mode Overlay */}
            {breakdownMode && (
                <div className="breakdown-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: theme.bg, zIndex: 3000, display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{ padding: '20px', background: '#dc2626', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '20px' }}>🚨 EMERGENCY MODE</h1>
                            <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Bus Breakdown - Finding Nearby Help</p>
                        </div>
                        <button onClick={() => setBreakdownMode(false)} style={{
                            background: 'white', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                            Exit
                        </button>
                    </div>

                    <div style={{ flex: 1, position: 'relative' }}>
                        <BreakdownMap
                            buses={unavailableBuses.filter(b => b.id !== busNumber)}
                            myLocation={currentLocation}
                            onContact={(bus) => {
                                alert(`Requesting help from Bus ${bus.id} (${bus.driverName})...`);
                            }}
                        />
                    </div>

                    <div style={{ padding: '20px', background: theme.cardRg, borderTop: `1px solid ${theme.border}` }}>
                        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Instructions:</p>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: theme.subText }}>
                            <li>Identify the nearest bus on the map.</li>
                            <li>Click on a bus to see distance and driver info.</li>
                            <li>Contact the driver to arrange student pickup.</li>
                        </ul>
                    </div>
                </div>
            )}

            {isMaintenance ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚧</div>
                    <h1 style={{ fontSize: '28px', color: '#c2410c', margin: '0 0 16px 0' }}>Under Maintenance</h1>
                    <button onClick={() => setBusNumber('')} style={{ marginTop: '32px', padding: '12px 24px', background: '#fff7ed', border: '2px solid #fdba74', color: '#c2410c', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Choose Another Bus</button>
                    <button onClick={handleLogout} style={{ marginTop: '16px', background: 'none', border: 'none', color: theme.subText, textDecoration: 'underline', cursor: 'pointer' }}>Logout</button>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="driver-header" style={{
                        background: theme.cardRg, padding: '15px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: `1px solid ${theme.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Campus Transit</h1>
                            <div className="driver-header-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', color: theme.highlight, fontWeight: 'bold' }}>
                                    👋 Hi, {user?.displayName || 'Driver'}
                                </span>
                            </div>
                        </div>

                        <div className="driver-header-actions stack-mobile" style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={handleLogout}
                                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                            >
                                Logout
                            </button>
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                style={{ background: 'transparent', border: `1px solid ${theme.border}`, color: theme.text, padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                            >
                                {darkMode ? '☀️' : '🌙'}
                            </button>
                            <button
                                onClick={() => setShowQR(true)}
                                style={{ background: theme.highlight, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                📱 Show QR
                            </button>
                            <button
                                onClick={() => setShowPassengers(!showPassengers)}
                                style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : '#f1f5f9', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: theme.text, border: 'none', cursor: 'pointer', position: 'relative' }}
                            >
                                👥 {passengers.length}
                                {leaveRequests.length > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '-6px', right: '-6px',
                                        background: '#f59e0b', color: 'white', borderRadius: '50%',
                                        width: '18px', height: '18px', fontSize: '10px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>{leaveRequests.length}</span>
                                )}
                            </button>
                            {isActive && (
                                <div style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: theme.text }}>
                                    ⏱️ {formatTime(elapsedTime)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warning Banner */}
                    <AnimatePresence>
                        {isSpeeding && isActive && (
                            <motion.div
                                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="speed-warning"
                                style={{ background: '#ef4444', color: 'white', textAlign: 'center', overflow: 'hidden' }}
                            >
                                <div style={{ padding: '8px', fontWeight: 'bold', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    <span>⚠️</span> SLOW DOWN! SPEED LIMIT EXCEEDED
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content */}
                    <div className="responsive-padding" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px', position: 'relative', overflowY: 'auto' }}>

                        {/* Next Stop Card */}
                        <AnimatePresence>
                            {isActive && nextStop && (
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="trip-info-card stack-mobile"
                                    style={{
                                        width: '100%', maxWidth: '600px', marginBottom: '20px',
                                        background: theme.highlight, color: 'white', borderRadius: '16px', padding: '16px 24px',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', fontWeight: 'bold' }}>Next Stop</div>
                                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{nextStop.name}</div>
                                        <div style={{ fontSize: '14px' }}>Expected: {nextStop.time || '--:--'}</div>
                                    </div>
                                    <button
                                        onClick={handleNextStop}
                                        style={{
                                            background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)',
                                            borderRadius: '12px', padding: '10px 20px', fontSize: '14px', fontWeight: 'bold',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                    >
                                        Next Stop ➡️
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* View Toggle (Map vs Speed) */}
                        {isActive && (
                            <div className="view-toggle-container full-width-mobile" style={{ display: 'flex', background: theme.cardRg, padding: '4px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${theme.border}` }}>
                                <button
                                    onClick={() => setViewMode('speed')}
                                    className="view-toggle-button"
                                    style={{
                                        padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: viewMode === 'speed' ? theme.highlight : 'transparent', color: viewMode === 'speed' ? 'white' : theme.subText,
                                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    Gauge Speed
                                </button>
                                <button
                                    onClick={() => setViewMode('map')}
                                    style={{
                                        padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                        background: viewMode === 'map' ? theme.highlight : 'transparent', color: viewMode === 'map' ? 'white' : theme.subText,
                                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    🗺️ Map
                                </button>
                            </div>
                        )}

                        {/* Feature 4: Weather Widget — shown when GPS active */}
                        {weather && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                style={{
                                    width: '100%', maxWidth: '400px', marginBottom: '16px',
                                    background: (weather.label.includes('Rain') || weather.label.includes('Thunder')) ? '#fef3c7' : theme.cardRg,
                                    border: `1px solid ${(weather.label.includes('Rain') || weather.label.includes('Thunder')) ? '#fde047' : theme.border}`,
                                    borderRadius: '14px', padding: '12px 20px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '28px' }}>{weather.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: theme.text }}>{weather.label}</div>
                                        <div style={{ fontSize: '12px', color: theme.subText }}>💨 {weather.wind} km/h</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.text }}>{weather.temp}°C</div>
                                    {(weather.label.includes('Rain') || weather.label.includes('Thunder')) && (
                                        <button
                                            onClick={() => setShowDelayModal(true)}
                                            style={{ fontSize: '11px', background: '#fde047', border: 'none', borderRadius: '6px', padding: '3px 8px', fontWeight: 'bold', cursor: 'pointer', color: '#78350f' }}
                                        >⚠️ Report Delay</button>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Bus Selection (Only if not active) */}
                        {!isActive && (
                            <div style={{ marginBottom: '40px', zIndex: 10, width: '100%', maxWidth: '400px' }}>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={busNumber}
                                        onChange={(e) => setBusNumber(e.target.value)}
                                        style={{
                                            appearance: 'none',
                                            background: theme.cardRg, border: `1px solid ${theme.border}`, padding: '16px', borderRadius: '16px',
                                            fontSize: '20px', color: theme.text, fontWeight: 'bold', width: '100%',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer', textAlign: 'center'
                                        }}
                                    >
                                        <option value="" disabled>Select Your Bus</option>
                                        {(() => {
                                            // Combine static buses (101-124) with custom routes
                                            const staticBuses = Array.from({ length: 24 }, (_, i) => (101 + i).toString());
                                            const customBusIds = Object.keys(customRoutes);
                                            // Unique set of all bus IDs
                                            const allBusIds = [...new Set([...staticBuses, ...customBusIds])];

                                            // Sort Alphanumerically (3A before 101)
                                            allBusIds.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

                                            return allBusIds.map(strNum => {
                                                const busData = unavailableBuses.find(b => b.id === strNum);
                                                const isTaken = !!busData && strNum !== busNumber;

                                                // Check for static assignment or custom route data
                                                const routeData = customRoutes[strNum] || (BUS_ROUTES[strNum] ? { driver: BUS_ROUTES[strNum].driver } : null);

                                                // Extract driver name safely
                                                let assignedDriver = null;
                                                if (routeData) {
                                                    if (routeData.driver) assignedDriver = routeData.driver.split(' - ')[0];
                                                    else if (routeData.driverName) assignedDriver = routeData.driverName;
                                                }

                                                let label = `${strNum}`;
                                                if (assignedDriver) {
                                                    label += ` - ${assignedDriver}`;
                                                }

                                                if (isTaken) {
                                                    const currentDriver = busData.driverName;
                                                    label += ` (Busy${currentDriver && currentDriver !== assignedDriver ? ` by ${currentDriver}` : ''})`;
                                                }

                                                return (
                                                    <option key={strNum} value={strNum} disabled={isTaken}>
                                                        {label}
                                                    </option>
                                                );
                                            });
                                        })()}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Center Display (Speedometer or Map) */}
                        {viewMode === 'speed' || !isActive ? (
                            <motion.div className="speedometer-wrapper" layout initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ marginBottom: '40px' }}>
                                <AnalogSpeedometer speed={speed} />
                            </motion.div>
                        ) : (
                            <motion.div className="driver-map-container" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%', maxWidth: '800px', marginBottom: '40px', height: '500px' }}>
                                <DriverMap location={currentLocation} routeStops={currentRoute?.stops} />
                            </motion.div>
                        )}


                        {/* Action Button */}
                        <div className="slide-button-container action-buttons-container" style={{ width: '100%', maxWidth: '300px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {!isActive ? (
                                busNumber ? (
                                    <SlideButton key="start" type="start" onSlideSuccess={handleBeforeStart} />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '16px', background: theme.cardRg, borderRadius: '16px', color: theme.subText }}>Please Select a Bus Above</div>
                                )
                            ) : (
                                <>
                                    <SlideButton key="end" type="end" onSlideSuccess={() => toggleTrip(false)} />

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', width: '100%' }}>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowDelayModal(true)}
                                            className="action-button"
                                            style={{
                                                padding: '12px', borderRadius: '16px', border: 'none',
                                                background: theme.cardRg, color: '#f59e0b', fontSize: '13px', fontWeight: 'bold',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer'
                                            }}
                                        >
                                            <span>⏳</span> Delay
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowMaintenanceModal(true)}
                                            className="action-button"
                                            style={{
                                                padding: '12px', borderRadius: '16px', border: 'none',
                                                background: theme.cardRg, color: '#ef4444', fontSize: '13px', fontWeight: 'bold',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer'
                                            }}
                                        >
                                            <span>🛠️</span> Fix
                                        </motion.button>
                                        <motion.button
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowExpenseModal(true)}
                                            style={{
                                                padding: '12px', borderRadius: '16px', border: 'none',
                                                background: theme.cardRg, color: '#10b981', fontSize: '13px', fontWeight: 'bold',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', cursor: 'pointer'
                                            }}
                                        >
                                            <span>⛽</span> Fuel
                                        </motion.button>
                                    </div>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            if (confirm("Report Breakdown and enter Emergency Mode?")) {
                                                handleReportDelay("BREAKDOWN");
                                                setBreakdownMode(true);
                                            }
                                        }}
                                        style={{
                                            width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                                            background: '#fee2e2', color: '#dc2626', fontSize: '14px', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: 'pointer', border: '2px solid #fecaca'
                                        }}
                                    >
                                        <span>🚨</span> REPORT BREAKDOWN
                                    </motion.button>
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowFoundModal(true)}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '16px', border: 'none',
                                            background: '#eff6ff', color: '#2563eb', fontSize: '14px', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span>🔎</span> Report Found Item
                                    </motion.button>
                                </>
                            )}
                        </div>

                        {/* Feature 3 & 2: Quick Alert + Performance buttons */}
                        {busNumber && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', width: '100%', maxWidth: '300px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowQuickAlert(true)}
                                    style={{
                                        flex: 1, minWidth: '130px', padding: '13px', borderRadius: '14px', border: 'none',
                                        background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white',
                                        fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    📣 Quick Alert
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowPerformance(true)}
                                    style={{
                                        flex: 1, minWidth: '130px', padding: '13px', borderRadius: '14px', border: 'none',
                                        background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white',
                                        fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    ⭐ My Performance
                                </motion.button>
                            </div>
                        )}

                        {/* Community Link */}
                        <button
                            onClick={() => router.push(`/community?bus=${busNumber}`)}
                            style={{
                                marginTop: '16px', padding: '12px 24px', borderRadius: '12px', border: 'none',
                                background: theme.cardRg, color: theme.highlight, fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '10px'
                            }}
                        >
                            📢 Announcements
                        </button>
                    </div>

                    {/* SOS Button */}
                    <button
                        onClick={handleSOS}
                        style={{
                            position: 'fixed', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '50%',
                            background: '#ef4444', color: 'white', border: '4px solid #fecaca', boxShadow: '0 10px 15px rgba(239, 68, 68, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '32px' }}>⚠️</span>
                    </button>

                    {/* Passenger List Overlay */}
                    <AnimatePresence>
                        {showPassengers && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                                className="passenger-modal"
                                style={{
                                    position: 'absolute', top: '80px', right: '20px', width: '300px', background: theme.cardRg,
                                    borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', border: `1px solid ${theme.border}`,
                                    zIndex: 50, maxHeight: '400px', overflowY: 'auto', padding: '16px'
                                }}
                            >
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: theme.text }}>Passengers on Board</h3>
                                <p style={{ margin: '0 0 12px', fontSize: '12px', color: theme.subText }}>Tap 📞 to call a parent directly</p>
                                {passengers.length === 0 && <p style={{ color: theme.subText, textAlign: 'center', fontSize: '14px' }}>No passengers yet</p>}
                                {passengers.map(p => {
                                    const rosterEntry = stopRoster.find(r => r.name === p.name);
                                    const parentPhone = rosterEntry?.parentPhoneNumber;
                                    return (
                                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                                            <div>
                                                <div style={{ color: theme.text, fontWeight: '500', fontSize: '14px' }}>{p.name}</div>
                                                {rosterEntry?.stopName && <div style={{ fontSize: '11px', color: theme.subText }}>📍 {rosterEntry.stopName}</div>}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#10b981', fontSize: '12px' }}>● Boarded</span>
                                                {parentPhone && (
                                                    <a href={`tel:${parentPhone}`} style={{ textDecoration: 'none' }}>
                                                        <button style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>📞</button>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Feature 1: Stop Roster for upcoming stop */}
                                {isActive && nextStop && nextStop.name && nextStop.name !== '🏁 End of Route' && (() => {
                                    const expectedAtStop = stopRoster.filter(s => s.stopName === nextStop.name);
                                    const absentAtStop = leaveRequests.filter(l => l.stopName === nextStop.name);
                                    const presentExpected = expectedAtStop.filter(s => !absentAtStop.find(a => a.studentName === s.name));
                                    if (expectedAtStop.length === 0) return null;
                                    return (
                                        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px dashed #bfdbfe' }}>
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                📍 Next Stop: {nextStop.name}
                                            </h4>
                                            <p style={{ margin: '0 0 8px', fontSize: '11px', color: theme.subText }}>
                                                Expecting {presentExpected.length} to board{absentAtStop.length > 0 ? `, ${absentAtStop.length} absent` : ''}
                                            </p>
                                            {presentExpected.map(s => (
                                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', marginBottom: '4px' }}>
                                                    <span style={{ color: '#1e40af', fontWeight: '600', fontSize: '13px' }}>{s.name}</span>
                                                    {s.parentPhoneNumber && (
                                                        <a href={`tel:${s.parentPhoneNumber}`} style={{ textDecoration: 'none' }}>
                                                            <button style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer' }}>📞 Parent</button>
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                            {absentAtStop.map(a => (
                                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', marginBottom: '4px' }}>
                                                    <span style={{ color: '#92400e', fontSize: '13px' }}>{a.studentName}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', background: '#fde047', padding: '2px 6px', borderRadius: '4px' }}>ABSENT</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {/* Absent Today (full list) */}
                                {leaveRequests.length > 0 && (
                                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '2px dashed #fde047' }}>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            🏖️ All Absent Today ({leaveRequests.length})
                                        </h4>
                                        {leaveRequests.map(lr => (
                                            <div key={lr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '8px', marginBottom: '6px' }}>
                                                <div>
                                                    <span style={{ color: '#78350f', fontWeight: '600', fontSize: '13px' }}>{lr.studentName || 'Student'}</span>
                                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#92400e' }}>📍 {lr.stopName || 'Unknown Stop'}</p>
                                                </div>
                                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', background: '#fde047', padding: '3px 6px', borderRadius: '4px' }}>ABSENT</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button onClick={handleClearPassengers} style={{ width: '100%', marginTop: '12px', padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Clear Board List</button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* QR Modal */}
                    <AnimatePresence>
                        {showQR && (
                            <div className="qr-container" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowQR(false)}>
                                <div style={{ background: 'white', padding: '32px', borderRadius: '24px', textAlign: 'center' }}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${busNumber}`} alt="QR" />
                                    <button onClick={() => setShowQR(false)} style={{ marginTop: '20px', padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Delay Report Modal */}
                    <AnimatePresence>
                        {showDelayModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    className="delay-modal"
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '24px', border: `1px solid ${theme.border}` }}
                                >
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: theme.text }}>Report a Delay</h2>
                                    <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '20px' }}>Notify the admin about late arrival.</p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                        {['Heavy Traffic', 'Breakdown', 'Weather', 'Accident'].map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => handleReportDelay(reason)}
                                                style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const reason = prompt("Enter specific reason for delay:");
                                                if (reason && reason.trim()) handleReportDelay(reason.trim());
                                            }}
                                            style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', gridColumn: '1 / -1' }}
                                        >
                                            Others (Custom Reason)
                                        </button>
                                    </div>
                                    <button onClick={() => setShowDelayModal(false)} style={{ width: '100%', padding: '12px', background: theme.bg, color: theme.subText, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Maintenance Modal */}
                    <AnimatePresence>
                        {showMaintenanceModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '24px', border: `1px solid ${theme.border}` }}
                                >
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: theme.text }}>Request Maintenance</h2>
                                    <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '20px' }}>What needs fixing?</p>
                                    <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                                        {['Brake Issue', 'Engine Noise', 'AC Not Cooling', 'Tire Issue', 'Seat Broken', 'Lights Malfunction'].map(issue => (
                                            <button key={issue} onClick={() => handleReportMaintenance(issue)} style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, fontSize: '13px', fontWeight: '600', cursor: 'pointer', textAlign: 'left' }}>
                                                🔧 {issue}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowMaintenanceModal(false)} style={{ width: '100%', padding: '12px', background: theme.bg, color: theme.subText, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Found Item Modal */}
                    <AnimatePresence>
                        {showFoundModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '24px', border: `1px solid ${theme.border}` }}
                                >
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: theme.text }}>Found Item?</h2>
                                    <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '20px' }}>Help it reach the owner.</p>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        handleReportFoundItem(e.target.item.value, e.target.desc.value);
                                    }}>
                                        <input name="item" placeholder="What did you find?" required style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }} />
                                        <textarea name="desc" placeholder="Brief description (e.g. blue bag, near rear seat)" required style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, minHeight: '80px' }} />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button type="button" onClick={() => setShowFoundModal(false)} style={{ flex: 1, padding: '12px', background: theme.bg, color: theme.subText, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                            <button type="submit" style={{ flex: 1, padding: '12px', background: theme.highlight, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Report</button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Expense Logger Modal */}
                    <AnimatePresence>
                        {showExpenseModal && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '340px', borderRadius: '24px', padding: '24px', border: `1px solid ${theme.border}` }}
                                >
                                    <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: theme.text }}>Log Fuel / Expense</h2>
                                    <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '20px' }}>Keep track of your fuel and trip expenses.</p>
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        handleReportExpense(e.target.type.value, e.target.amount.value, e.target.desc.value);
                                    }}>
                                        <select name="type" required style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }}>
                                            <option value="Fuel">Fuel / Gas</option>
                                            <option value="Toll">Toll Fee</option>
                                            <option value="Maintenance">Quick Repairs</option>
                                            <option value="Other">Other Expenses</option>
                                        </select>
                                        <input name="amount" type="number" step="0.01" min="0" placeholder="Amount (₹)" required style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text }} />
                                        <textarea name="desc" placeholder="Details (e.g. 20L Diesel, Toll Booth name)" required style={{ width: '100%', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, minHeight: '80px', resize: 'none' }} />
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button type="button" onClick={() => setShowExpenseModal(false)} style={{ flex: 1, padding: '12px', background: theme.bg, color: theme.subText, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                            <button type="submit" style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Submit</button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Feature 3: Quick Alert Modal */}
                    <AnimatePresence>
                        {showQuickAlert && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                                onClick={() => setShowQuickAlert(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '28px', border: `1px solid ${theme.border}` }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: theme.text }}>📣 Quick Alert to Students</h2>
                                    <p style={{ color: theme.subText, fontSize: '13px', marginBottom: '20px' }}>Sends an in-app notification to all students on Bus {busNumber}.</p>
                                    <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
                                        {[
                                            '🚌 Bus is on the way — get ready!',
                                            '📍 Bus has arrived at your stop!',
                                            '⏳ Bus is running 10 mins late.',
                                            '⏳ Bus is running 20 mins late.',
                                            '✅ Trip has started — all students board now.',
                                            '🏁 Last stop reached — please exit the bus.'
                                        ].map(msg => (
                                            <button
                                                key={msg}
                                                onClick={() => handleQuickAlert(msg)}
                                                disabled={quickAlertSending}
                                                style={{
                                                    padding: '12px 16px', borderRadius: '12px',
                                                    border: `1px solid ${theme.border}`,
                                                    background: 'transparent', color: theme.text,
                                                    fontSize: '13px', fontWeight: '500',
                                                    cursor: quickAlertSending ? 'not-allowed' : 'pointer',
                                                    textAlign: 'left', opacity: quickAlertSending ? 0.5 : 1
                                                }}
                                            >{msg}</button>
                                        ))}
                                    </div>
                                    <button onClick={() => setShowQuickAlert(false)} style={{ width: '100%', padding: '12px', background: theme.bg, color: theme.subText, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Feature 2: My Performance Modal */}
                    <AnimatePresence>
                        {showPerformance && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                                onClick={() => setShowPerformance(false)}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                                    style={{ background: theme.cardRg, width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '28px', border: `1px solid ${theme.border}`, maxHeight: '85vh', overflowY: 'auto' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h2 style={{ margin: 0, fontSize: '20px', color: theme.text }}>⭐ My Performance</h2>
                                        <button onClick={() => setShowPerformance(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.subText }}>✕</button>
                                    </div>

                                    {/* Stats Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ background: '#eff6ff', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#1d4ed8' }}>{myTrips.length}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Total Trips</div>
                                        </div>
                                        <div style={{ background: '#fefce8', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#92400e' }}>
                                                {myFeedbacks.length > 0 ? (myFeedbacks.reduce((a, f) => a + (f.rating || 0), 0) / myFeedbacks.length).toFixed(1) : '—'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Avg Rating</div>
                                        </div>
                                        <div style={{ background: '#f0fdf4', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#166534' }}>{myFeedbacks.length}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Reviews</div>
                                        </div>
                                    </div>

                                    {/* Rating bar chart */}
                                    {myFeedbacks.length > 0 && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: theme.text }}>Rating Breakdown</h4>
                                            {[5, 4, 3, 2, 1].map(star => {
                                                const count = myFeedbacks.filter(f => Math.round(f.rating) === star).length;
                                                const pct = myFeedbacks.length ? Math.round((count / myFeedbacks.length) * 100) : 0;
                                                return (
                                                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <span style={{ fontSize: '12px', width: '20px', color: theme.text }}>{star}★</span>
                                                        <div style={{ flex: 1, height: '8px', background: theme.border, borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: star >= 4 ? '#22c55e' : star === 3 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }} />
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: theme.subText, width: '24px' }}>{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Recent feedback comments */}
                                    <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: theme.text }}>Recent Student Feedback</h4>
                                    {myFeedbacks.length === 0 && (
                                        <p style={{ color: theme.subText, textAlign: 'center', padding: '20px 0' }}>No feedback yet. Keep driving safely! 🚌</p>
                                    )}
                                    {myFeedbacks.slice(0, 6).map(f => (
                                        <div key={f.id} style={{ padding: '12px', background: theme.bg, borderRadius: '12px', marginBottom: '8px', border: `1px solid ${theme.border}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#f59e0b' }}>
                                                    {'★'.repeat(Math.round(f.rating || 0))}{'☆'.repeat(5 - Math.round(f.rating || 0))}
                                                </span>
                                                <span style={{ fontSize: '11px', color: theme.subText }}>{f.createdAt?.toDate?.()?.toLocaleDateString?.() || ''}</span>
                                            </div>
                                            {f.comment && <p style={{ margin: 0, fontSize: '13px', color: theme.subText, fontStyle: 'italic' }}>"{f.comment}"</p>}
                                        </div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
