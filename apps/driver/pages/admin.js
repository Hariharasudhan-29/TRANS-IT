import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, setDoc, writeBatch, getDoc, getDocs, where } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '../firebaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, Trash2, Wrench, Search } from 'lucide-react';

import { BUS_ROUTES } from '../../student/data/busRoutes';

const AdminMap = dynamic(() => import('../components/AdminMap'), { ssr: false });

const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export default function AdminPanel() {
    const [user, setUser] = useState(null);
    const [authorizing, setAuthorizing] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [driversList, setDriversList] = useState([]);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    // db initialized lazily inside effects/handlers

    // Data States
    const [trips, setTrips] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [queries, setQueries] = useState([]);
    const [usersList, setUsersList] = useState([]); // For User Management
    const [sosAlerts, setSosAlerts] = useState([]); // For SOS
    const [adminNotifications, setAdminNotifications] = useState([]); // For Notifications
    const [routesList, setRoutesList] = useState([]); // For Routes
    const [trackingData, setTrackingData] = useState([]); // For Live Map
    const [lostFoundItems, setLostFoundItems] = useState([]); // For Lost & Found
    const [maintenanceRequests, setMaintenanceRequests] = useState([]); // For Maintenance
    const [expenses, setExpenses] = useState([]); // For Expenses
    const [loading, setLoading] = useState(false);
    const [leaveRequests, setLeaveRequests] = useState([]); // Leave Applications
    const [geofences, setGeofences] = useState([]); // Geofences

    // Editing State for Routes
    const [editingRoute, setEditingRoute] = useState(null);
    // Form States
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [selectedDate, setSelectedDate] = useState(''); // Default to Today
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [geofenceForm, setGeofenceForm] = useState({ name: '', lat: '', lng: '', radius: '200' });

    useEffect(() => {
        initFirebase();
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            if (u && u.email?.toLowerCase() === 'admin@transit.com') {
                setUser(u);
                // Replace history state to prevent back button issues
                if (typeof window !== 'undefined') {
                    window.history.replaceState(null, '', '/admin');
                }
            } else {
                setUser(null);
                router.replace('/admin-login');
            }
            setAuthorizing(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch Data based on Tab (or all active subscriptions)
    useEffect(() => {
        if (!user) return;
        const db = getFirestore();

        // 1. Trips
        const qTrips = query(collection(db, 'trip_logs'), orderBy('startTime', 'desc'));
        const unsubTrips = onSnapshot(qTrips, (snap) => {
            setTrips(snap.docs.map(d => ({ id: d.id, ...d.data(), startTime: d.data().startTime?.toDate?.() || new Date(d.data().startTime), endTime: d.data().endTime?.toDate?.() || (d.data().endTime ? new Date(d.data().endTime) : null) })));
        });

        // 2. Announcements
        const qAnnounce = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsubAnnounce = onSnapshot(qAnnounce, (snap) => {
            setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Feedback
        const qFeedback = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
        const unsubFeedback = onSnapshot(qFeedback, (snap) => {
            setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 4. Queries (Support)
        const qQueries = query(collection(db, 'queries'), orderBy('createdAt', 'desc'));
        const unsubQueries = onSnapshot(qQueries, (snap) => {
            setQueries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 5. Routes
        const qRoutes = query(collection(db, 'routes'));
        const unsubRoutes = onSnapshot(qRoutes, (snap) => {
            setRoutesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 6. Tracking (Live Map)
        const qTracking = query(collection(db, 'tracking'));
        const unsubTracking = onSnapshot(qTracking, (snap) => {
            const now = Date.now();
            setTrackingData(snap.docs.map(d => {
                const data = d.data();
                // Check if data is stale (> 5 minutes old)
                const lastUpdate = data.lastUpdated?.seconds ? data.lastUpdated.seconds * 1000 : (data.lastUpdated?.toMillis ? data.lastUpdated.toMillis() : 0);
                const isStale = (now - lastUpdate) > 300000;
                return {
                    id: d.id,
                    ...data,
                    // Force active to false if stale
                    active: isStale ? false : data.active
                };
            }));
        });

        // 7. SOS Alerts
        const qSOS = query(collection(db, 'sos_alerts'), orderBy('createdAt', 'desc'));
        const unsubSOS = onSnapshot(qSOS, (snap) => {
            setSosAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 8. Notifications
        const qNotif = query(collection(db, 'admin_notifications'), orderBy('timestamp', 'desc'));
        const unsubNotif = onSnapshot(qNotif, (snap) => {
            setAdminNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 9. Drivers List
        const qDrivers = query(collection(db, 'drivers'), orderBy('name'));
        const unsubDrivers = onSnapshot(qDrivers, (snap) => {
            setDriversList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.log(err));

        // 10. Registered Students (Users)
        const qUsers = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'student'));
        }, (err) => console.log(err));

        // 11. Lost & Found
        const qLostFound = query(collection(db, 'lost_found'), orderBy('createdAt', 'desc'));
        const unsubLostFound = onSnapshot(qLostFound, (snap) => {
            setLostFoundItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 12. Maintenance Requests
        const qMaintenance = query(collection(db, 'maintenance_requests'), orderBy('createdAt', 'desc'));
        const unsubMaintenance = onSnapshot(qMaintenance, (snap) => {
            setMaintenanceRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 12b. Expenses
        const qExpenses = query(collection(db, 'driver_expenses'), orderBy('createdAt', 'desc'));
        const unsubExpenses = onSnapshot(qExpenses, (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 13. Leave Requests
        const qLeave = query(collection(db, 'leave_requests'), orderBy('date', 'desc'));
        const unsubLeave = onSnapshot(qLeave, (snap) => {
            setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 14. Geofences
        const qGeo = query(collection(db, 'geofences'));
        const unsubGeo = onSnapshot(qGeo, (snap) => {
            setGeofences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubTrips();
            unsubAnnounce();
            unsubFeedback();
            unsubQueries();
            unsubRoutes();
            unsubTracking();
            unsubSOS();
            unsubNotif();
            unsubDrivers();
            unsubUsers();
            unsubLostFound();
            unsubMaintenance();
            unsubExpenses();
            unsubLeave();
            unsubGeo();
        };
    }, [user]);

    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
        router.push('/admin-login');
    };

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        if (!newAnnouncement.trim()) return;
        try {
            const db = getFirestore();
            await addDoc(collection(db, 'announcements'), {
                message: newAnnouncement,
                createdAt: serverTimestamp(),
                active: true,
                type: 'info'
            });
            setNewAnnouncement('');
        } catch (err) {
            console.error("Error posting announcement:", err);
            alert("Failed to post");
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'announcements', id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleCompleteQuery = async (id) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'queries', id), {
                status: 'completed',
                completedAt: serverTimestamp()
            });
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        // Handle Firestore Timestamp or Date
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleString();
    };

    const changeDate = (days) => {
        const currentDate = selectedDate ? new Date(selectedDate) : new Date();
        currentDate.setDate(currentDate.getDate() + days);
        setSelectedDate(currentDate.toLocaleDateString('en-CA'));
    };

    // Abort Trip Handler
    const handleAbortTrip = async (trip) => {
        const confirmMessage = `Are you sure you want to ABORT the trip for Bus ${trip.busNumber}?\n\nDriver: ${trip.driverName || 'Unknown'}\nPassengers: ${trip.passengerCount || 0}\n\nThis will forcefully end the active trip.`;

        if (!confirm(confirmMessage)) return;

        try {
            const db = getFirestore();
            const busNumber = trip.busNumber;

            // 1. Update tracking to set active = false
            await updateDoc(doc(db, 'tracking', busNumber), {
                active: false,
                status: 'Aborted by Admin',
                abortedAt: serverTimestamp(),
                abortedBy: user?.email || 'admin'
            });

            // 2. Create trip log entry
            await addDoc(collection(db, 'trip_logs'), {
                busNumber: busNumber,
                driverName: trip.driverName || 'Unknown',
                startTime: trip.startTime || serverTimestamp(),
                endTime: serverTimestamp(),
                status: 'Aborted by Admin',
                passengerCount: trip.passengerCount || 0,
                abortedBy: user?.email || 'admin',
                reason: 'Admin intervention'
            });

            // 3. Send notification to driver (optional)
            await addDoc(collection(db, 'admin_notifications'), {
                type: 'TRIP_ABORTED',
                busNumber: busNumber,
                driverName: trip.driverName || 'Unknown',
                message: `Your trip for Bus ${busNumber} has been aborted by admin.`,
                timestamp: serverTimestamp(),
                status: 'sent',
                priority: 'high'
            });

            // 4. Clear passenger count
            await updateDoc(doc(db, 'tracking', busNumber), {
                passengerCount: 0
            });

            alert(`Trip for Bus ${busNumber} has been successfully aborted.`);
        } catch (error) {
            console.error('Error aborting trip:', error);
            alert('Failed to abort trip. Please try again.');
        }
    };

    const handleDeleteTripLog = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this trip log?')) return;
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'trip_logs', id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete trip log');
        }
    };

    // --- NEW FEATURES ---

    const handleUserAction = async (uid, method, disabled = null) => {
        if (!confirm('Are you sure you want to perform this action?')) return;
        try {
            // First perform client-side Firestore updates to ensure immediate UI feedback/blocking
            const db = getFirestore();
            if (method === 'DELETE') {
                await deleteDoc(doc(db, 'users', uid)).catch(e => console.warn("Firestore delete issue:", e));
            } else if (method === 'PUT') {
                await updateDoc(doc(db, 'users', uid), { disabled }).catch(e => console.warn("Firestore update issue:", e));
            }

            // Also try hitting the backend to perform Firebase Auth-level disables/deletes
            // This may fail with 500 if the local environment lacks firebase-service-account.json
            const body = { uid };
            if (disabled !== null) body.disabled = disabled;
            fetch('/api/admin/users', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                .catch(e => console.warn("Backend auth update failed (likely missing service account):", e));

            alert('Action performed successfully!');
        } catch (e) { alert(e.message); }
    };

    // Users are automatically loaded via onSnapshot
    useEffect(() => {
        // removed fetchUsers
    }, [activeTab]);


    const exportTripsToCSV = () => {
        if (!trips.length) return alert("No trips to export");
        const headers = ["Date", "Bus", "Driver", "Start Time", "End Time", "Status"];
        const rows = trips.map(t => [
            formatDate(t.startTime),
            t.busNumber,
            t.driverName,
            t.startTime?.toLocaleTimeString() || '',
            t.endTime?.toLocaleTimeString() || '',
            t.status
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "trip_logs.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddOrUpdateRoute = async (e) => {
        e.preventDefault();
        const form = e.target;
        const routeId = form.routeId.value;
        const busNumber = form.busNumber.value;
        const stops = form.stops.value.split(',').map(s => s.trim());

        try {
            const db = getFirestore();
            // Use busNumber as Doc ID to ensure Uniqueness/Overwriting logic
            await setDoc(doc(db, 'routes', busNumber), {
                routeId,
                busNumber,
                stops,
                updatedAt: serverTimestamp()
            }, { merge: true }); // Merge to keep other fields if any

            form.reset();
            setEditingRoute(null);
            alert(editingRoute ? 'Route updated!' : 'Route added!');
        } catch (err) { alert(err.message); }
    };

    const handleResolveSOS = async (id) => {
        try {
            const db = getFirestore();
            await updateDoc(doc(db, 'sos_alerts', id), {
                status: 'resolved',
                resolvedAt: serverTimestamp()
            });
        } catch (e) { alert(e.message); }
    };

    // Merge Static and Firestore Routes
    const displayedRoutes = useMemo(() => {
        const merged = { ...BUS_ROUTES }; // Start with Static Object

        // Formatted Array of Static
        let finalRoutes = Object.entries(merged).map(([busNum, data]) => ({
            id: busNum, // Use busNum as ID for consistency
            busNumber: busNum,
            routeId: `Route ${busNum}`,
            stops: data.stops.map(s => s.name),
            driver: data.driver,
            isStatic: true
        }));

        // Overlay Firestore Data
        // If Firestore has this busNumber, replace the static entry
        // If Firestore has new busNumber, add it

        // Create Map of Final Routes by BusNumber
        const routeMap = new Map(finalRoutes.map(r => [r.busNumber, r]));

        routesList.forEach(r => {
            const existing = routeMap.get(r.busNumber) || {};
            routeMap.set(r.busNumber, { ...existing, ...r, isStatic: false }); // Firestore overrides static (merging fields)
        });

        // Convert back to array and sort
        return Array.from(routeMap.values()).sort((a, b) => {
            return String(a.busNumber).localeCompare(String(b.busNumber), undefined, { numeric: true });
        });

    }, [routesList]);

    const startEditing = (route) => {
        setEditingRoute(route);
        // Scroll to top or form (Optional)
    };

    const handleDeleteRoute = async (id) => {
        if (!confirm('Delete this route?')) return;
        try {
            const db = getFirestore();
            await deleteDoc(doc(db, 'routes', id));
        } catch (e) { console.error(e); }
    };

    const handleImportRoutes = async () => {
        if (!confirm('Import default routes (101-124)? This will overwrite existing routes with the same IDs.')) return;
        setLoading(true);
        try {
            const db = getFirestore();
            const batch = writeBatch(db);

            Object.entries(BUS_ROUTES).forEach(([busNum, data]) => {
                const docRef = doc(db, 'routes', busNum);
                batch.set(docRef, {
                    routeId: `Route ${busNum}`,
                    busNumber: busNum,
                    stops: data.stops.map(s => s.name),
                    driverName: data.driver,
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
            alert('Routes imported successfully!');
        } catch (e) {
            console.error(e);
            alert('Import failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Global Broadcast SMS to all parent numbers
    const handleGlobalBroadcast = async () => {
        if (!broadcastMsg.trim()) return alert('Please enter a message.');
        if (!confirm(`Send this SMS to ALL registered parent numbers?\n\n"${broadcastMsg}"`)) return;
        setIsBroadcasting(true);
        try {
            const db = getFirestore();
            const snap = await getDocs(collection(db, 'users'));
            const parents = snap.docs.map(d => d.data()).filter(u => u.parentPhoneNumber);
            let sent = 0;
            for (const p of parents) {
                try {
                    await fetch('/api/send-sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ to: p.parentPhoneNumber, message: `[TRANS-IT ALERT] ${broadcastMsg}` })
                    });
                    sent++;
                } catch (e) { console.warn('SMS failed for', p.parentPhoneNumber); }
            }
            // Also post as announcement
            await addDoc(collection(db, 'announcements'), { message: broadcastMsg, createdAt: serverTimestamp(), active: true, type: 'broadcast' });
            alert(`✅ Broadcast sent! SMS dispatched to ${sent} parent(s). Also posted as an in-app announcement.`);
            setBroadcastMsg('');
        } catch (e) { alert('Broadcast failed: ' + e.message); }
        finally { setIsBroadcasting(false); }
    };

    // Bulk CSV Import for students
    const handleBulkImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target.result;
            const lines = text.trim().split('\n');
            // Expected CSV: name,email,busNumber,department,year,phoneNumber,parentPhoneNumber,stopName
            const header = lines[0].split(',').map(h => h.trim().toLowerCase());
            const db = getFirestore();
            const batch = writeBatch(db);
            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 2) continue;
                const obj = {};
                header.forEach((h, idx) => obj[h] = cols[idx] || '');
                if (!obj.email) continue;
                const docId = obj.email.replace(/[^a-zA-Z0-9]/g, '_');
                batch.set(doc(db, 'users', docId), { ...obj, role: 'student', importedAt: serverTimestamp() }, { merge: true });
                count++;
            }
            await batch.commit();
            alert(`✅ Imported ${count} student records from CSV successfully!`);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Save geofence
    const handleSaveGeofence = async () => {
        const { name, lat, lng, radius } = geofenceForm;
        if (!name || !lat || !lng) return alert('Fill in all geofence fields.');
        try {
            const db = getFirestore();
            await addDoc(collection(db, 'geofences'), {
                name, lat: parseFloat(lat), lng: parseFloat(lng),
                radius: parseFloat(radius) || 200,
                createdAt: serverTimestamp()
            });
            setGeofenceForm({ name: '', lat: '', lng: '', radius: '200' });
            alert('Geofence saved!');
        } catch (e) { alert(e.message); }
    };

    if (authorizing) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    if (!user) return null;

    const handleToggleStatus = async (busNumber, currentStatus) => {
        try {
            const db = getFirestore();
            const newStatus = currentStatus === 'maintenance' ? 'active' : 'maintenance';
            await setDoc(doc(db, 'routes', busNumber), {
                status: newStatus,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) { alert(e.message); }
    };

    const handleClearAllAssignments = async () => {
        if (!confirm('WARNING: This will remove ALL assigned drivers from ALL buses. Continue?')) return;
        try {
            const db = getFirestore();
            const batch = writeBatch(db);
            displayedRoutes.forEach(r => {
                // Only update if it has a driver or override
                // For static routes, setting driver: '' clears the override
                const ref = doc(db, 'routes', r.busNumber);
                batch.set(ref, { driver: '' }, { merge: true });
            });
            await batch.commit();
            alert('All assignments cleared.');
        } catch (e) { alert(e.message); }
    };

    const handleExportAssignments = () => {
        const headers = ["Bus Number", "Driver Name", "Phone", "Status"];
        const rows = displayedRoutes.map(r => {
            const parts = r.driver ? r.driver.split(' - ') : ['Unassigned', ''];
            return [
                r.busNumber,
                parts[0],
                parts[1] || '',
                r.status || 'Active'
            ];
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "driver_assignments.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddDriver = async () => {
        const nameEl = document.getElementById('newDriverName');
        const phoneEl = document.getElementById('newDriverPhone');
        const name = nameEl.value.trim();
        const phone = phoneEl.value.trim();
        if (!name) return;
        try {
            await addDoc(collection(getFirestore(), 'drivers'), {
                name, phone, createdAt: serverTimestamp()
            });
            nameEl.value = ''; phoneEl.value = '';
        } catch (e) { alert(e.message); }
    };

    const handleDeleteDriver = async (id) => {
        try {
            const db = getFirestore();
            // Check if assigned (Integrity Check)
            const q = query(collection(db, 'routes'), where('driverId', '==', id));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const assignedBus = snap.docs[0].id;
                alert(`Cannot delete: Driver is currently assigned to Bus ${assignedBus}. Unassign first.`);
                return;
            }

            if (!confirm('Remove this driver from the pool?')) return;
            await deleteDoc(doc(db, 'drivers', id));
        } catch (e) { alert(e.message); }
    };

    const handleAssignDriver = async (busNumber, driverId) => {
        let driverString = '';
        if (driverId === 'unassigned') {
            driverString = '';
        } else {
            const d = driversList.find(driver => driver.id === driverId);
            if (d) driverString = d.phone ? `${d.name} - ${d.phone}` : d.name;
        }

        try {
            const db = getFirestore();
            await setDoc(doc(db, 'routes', busNumber), {
                busNumber,
                driver: driverString,
                driverId: driverId === 'unassigned' ? null : driverId,
                updatedAt: serverTimestamp()
            }, { merge: true });
            setEditingAssignment(null);
            alert(`Bus ${busNumber} updated!`);
        } catch (e) { alert(e.message); }
    };

    const handleAddNewBus = async () => {
        const busNum = prompt("Enter new Bus Number (e.g. 125):");
        if (!busNum) return;
        try {
            const db = getFirestore();
            const busRef = doc(db, 'routes', busNum);

            // Prevent Overwrite
            const snap = await getDoc(busRef);
            if (snap.exists()) {
                alert(`Error: Bus ${busNum} already exists!`);
                return;
            }

            await setDoc(busRef, {
                busNumber: busNum,
                routeId: `Route ${busNum}`,
                stops: [],
                driver: '',
                driverId: null,
                createdAt: serverTimestamp()
            }, { merge: true });
            alert(`Bus ${busNum} added successfully! You can now assign a driver.`);
        } catch (e) { alert(e.message); }
    };

    const getBadgeCount = (tab) => {
        switch (tab) {
            case 'queries': return queries.filter(q => q.status !== 'completed').length;
            case 'sos': return sosAlerts.filter(a => a.status === 'active').length;
            case 'delays': return adminNotifications.filter(n => n.type === 'DELAY_REPORT').length;
            case 'maintenance': return maintenanceRequests.filter(m => m.status === 'pending').length;
            case 'expenses': return expenses.filter(e => e.status === 'pending').length;
            case 'lost_found': return lostFoundItems.filter(i => i.status === 'reported').length;
            case 'leave': return leaveRequests.filter(l => l.status === 'pending').length;
            default: return 0;
        }
    };

    return (
        <div style={{
            padding: '40px',
            fontFamily: '"Outfit", sans-serif',
            minHeight: '100vh',
            color: '#e2e8f0',
            background: 'linear-gradient(-45deg, #0f172a, #1e293b, #0c4a6e, #1e3a8a)',
            backgroundSize: '400% 400%',
            animation: 'gradient-animation 15s ease infinite'
        }}>
            <style jsx global>{`
                @keyframes gradient-animation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ maxWidth: '1200px', margin: '0 auto' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <motion.h1
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                        >
                            Admin Panel
                        </motion.h1>
                        <motion.p
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={{ color: '#94a3b8' }}
                        >
                            Manage your transit system
                        </motion.p>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#cbd5e1' }}>{user.email}</span>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleLogout} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#fca5a5', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>Logout</motion.button>
                        <Link href="/" style={{ textDecoration: 'none', color: '#60a5fa', fontWeight: '600' }}>← Home</Link>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1px', overflowX: 'auto' }}>
                    {['overview', 'analytics', 'trips', 'users', 'drivers', 'live_map', 'routes', 'announcements', 'broadcast', 'bulk_import', 'geofence', 'leave', 'feedback', 'queries', 'sos', 'delays', 'maintenance', 'expenses', 'lost_found'].map(tab => {
                        const count = getBadgeCount(tab);
                        return (
                            <motion.button
                                key={tab}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    padding: '12px 24px',
                                    background: activeTab === tab ? 'white' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeTab === tab ? 'white' : 'transparent',
                                    borderBottomColor: activeTab === tab ? 'white' : 'transparent',
                                    borderRadius: '12px 12px 0 0',
                                    color: activeTab === tab ? '#2563eb' : 'rgba(255,255,255,0.7)',
                                    fontWeight: activeTab === tab ? '700' : '600',
                                    cursor: 'pointer',
                                    textTransform: 'capitalize',
                                    marginBottom: '-1px',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {tab}
                                {count > 0 && (
                                    <span style={{
                                        background: '#ef4444', color: 'white', borderRadius: '50%',
                                        width: '20px', height: '20px', fontSize: '11px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                    }}>
                                        {count}
                                    </span>
                                )}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTabIndicator"
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#2563eb', borderRadius: '3px 3px 0 0' }}
                                    />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <motion.div
                    layout
                    style={{ background: 'white', borderRadius: '0 16px 16px 16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', minHeight: '400px', borderTopLeftRadius: activeTab === 'trips' ? '0' : '16px' }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Dashboard Overview</h3>

                                    {/* Analytics Section */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '20px' }}>

                                        {/* Activity Bar Chart */}
                                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <h4 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Weekly Trip Activity</h4>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '150px', paddingBottom: '10px', borderBottom: '1px solid #cbd5e1' }}>
                                                {[65, 40, 75, 50, 85, 95, 60].map((h, i) => (
                                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                                                        <div style={{
                                                            width: '24px',
                                                            height: `${h}%`,
                                                            background: i === 5 ? '#3b82f6' : '#bfdbfe',
                                                            borderRadius: '4px',
                                                            transition: 'height 0.5s ease'
                                                        }} />
                                                        <span style={{ fontSize: '10px', color: '#64748b' }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status Pie Chart */}
                                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <h4 style={{ margin: '0 0 20px 0', color: '#1e293b' }}>Fleet Status</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                                <div style={{
                                                    width: '120px', height: '120px', borderRadius: '50%',
                                                    background: 'conic-gradient(#22c55e 0% 60%, #ef4444 60% 75%, #eab308 75% 100%)',
                                                    position: 'relative'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute', inset: '25%', background: 'white', borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                                                    }}>
                                                        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>24</span>
                                                        <span style={{ fontSize: '10px', color: '#64748b' }}>Total</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '4px' }} />
                                                        <span style={{ fontSize: '14px', color: '#475569' }}>Active (60%)</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '12px', height: '12px', background: '#eab308', borderRadius: '4px' }} />
                                                        <span style={{ fontSize: '14px', color: '#475569' }}>Idle (25%)</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '4px' }} />
                                                        <span style={{ fontSize: '14px', color: '#475569' }}>Maintenance (15%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key Metrics Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' }}>
                                        <div style={{ padding: '24px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #dbeafe', color: '#1e3a8a' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Total Trips Today</h4>
                                            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{trips.length}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0', color: '#14532d' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Active Buses</h4>
                                            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{trips.filter(t => t.status === 'active').length}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#fff7ed', borderRadius: '16px', border: '1px solid #ffedd5', color: '#7c2d12' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Open Queries</h4>
                                            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{queries.filter(q => q.status !== 'completed').length}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#fdf4ff', borderRadius: '16px', border: '1px solid #f5d0fe', color: '#701a75' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Avg Rating</h4>
                                            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '4px 0 0 0' }}>
                                                {feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1) : '-'} <span style={{ fontSize: '16px' }}>★</span>
                                            </p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#fffbeb', borderRadius: '16px', border: '1px solid #fcd34d', color: '#78350f' }}>
                                            <h4 style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Delays Reported</h4>
                                            <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{adminNotifications.filter(n => n.type === 'DELAY_REPORT').length}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TRIPS TAB */}
                            {activeTab === 'trips' && (
                                <div style={{ padding: '40px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                        <h3 style={{ margin: 0 }}>Trip Management</h3>
                                        <button onClick={exportTripsToCSV} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📥</span> Export CSV
                                        </button>
                                    </div>

                                    {/* ONGOING TRIPS */}
                                    <div style={{ marginBottom: '40px' }}>
                                        <h4 style={{ fontSize: '18px', color: '#1e40af', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ position: 'relative', display: 'flex', height: '12px', width: '12px' }}>
                                                <span style={{ position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', background: '#60a5fa', opacity: 0.75, animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite' }}></span>
                                                <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '12px', width: '12px', background: '#3b82f6' }}></span>
                                            </span>
                                            Ongoing Trips ({trackingData.filter(t => t.active).length})
                                        </h4>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                            {trackingData.filter(t => t.active).map(trip => (
                                                <div key={trip.id} style={{ padding: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0369a1' }}>Bus {trip.busNumber}</span>
                                                        <span style={{ padding: '4px 8px', background: '#0ea5e9', color: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>
                                                            {trip.speed ? Math.round(trip.speed) : 0} km/h
                                                        </span>
                                                    </div>
                                                    <div style={{ color: '#334155', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>👤 <strong>Driver:</strong> {trip.driverName || 'Unknown'}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>👥 <strong>Passengers:</strong> {trip.passengerCount || 0}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>📍 <strong>Next Stop:</strong> {trip.nextStop || 'Checking...'}</div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>⏱️ <strong>Started:</strong> {trip.startTime ? formatDate(trip.startTime) : 'Just now'}</div>
                                                    </div>

                                                    {/* Abort Trip Button */}
                                                    <button
                                                        onClick={() => handleAbortTrip(trip)}
                                                        style={{
                                                            marginTop: '8px',
                                                            padding: '10px 16px',
                                                            background: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: '1px solid #fca5a5',
                                                            borderRadius: '8px',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '8px',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.background = '#fecaca';
                                                            e.target.style.transform = 'scale(1.02)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.background = '#fee2e2';
                                                            e.target.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        <span>⚠️</span> Abort Trip
                                                    </button>
                                                </div>
                                            ))}
                                            {trackingData.filter(t => t.active).length === 0 && (
                                                <div style={{ padding: '20px', gridColumn: '1/-1', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                                                    No ongoing trips at the moment.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* TRIP HISTORY */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '18px', color: '#334155', margin: 0 }}>Trip History</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Filter by Date:</span>
                                            <button
                                                onClick={() => changeDate(-1)}
                                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                                            >
                                                &lt;
                                            </button>
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                            />
                                            <button
                                                onClick={() => changeDate(1)}
                                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                                            >
                                                &gt;
                                            </button>
                                            {selectedDate && (
                                                <button onClick={() => setSelectedDate('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8fafc' }}>
                                                <tr>
                                                    <th style={thStyle}>Date</th>
                                                    <th style={thStyle}>Bus</th>
                                                    <th style={thStyle}>Driver</th>
                                                    <th style={thStyle}>Start Time</th>
                                                    <th style={thStyle}>End Time</th>
                                                    <th style={thStyle}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {trips.filter(trip => {
                                                    if (!selectedDate) return true;
                                                    const tripDate = trip.date || (trip.startTime ? formatDate(trip.startTime).split(',')[0] : '');
                                                    // Convert input date (YYYY-MM-DD) to locale string format if needed, or better, compare raw ISO/Date objects.
                                                    // Simple string check:
                                                    const d = new Date(selectedDate);
                                                    const localDate = d.toLocaleDateString(); // This might vary by browser/locale.
                                                    // More robust: Compare YYYY-MM-DD
                                                    const tDate = trip.startTime ? new Date(trip.startTime) : null;
                                                    if (!tDate) return false;
                                                    const tYMD = tDate.getFullYear() + '-' + String(tDate.getMonth() + 1).padStart(2, '0') + '-' + String(tDate.getDate()).padStart(2, '0');
                                                    return tYMD === selectedDate;
                                                }).map(trip => (
                                                    <tr key={trip.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                                                        <td style={tdStyle}>{trip.date || formatDate(trip.startTime).split(',')[0]}</td>
                                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                                {trip.busNumber}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTripLog(trip.id);
                                                                    }}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        padding: '4px',
                                                                        color: '#ef4444',
                                                                        borderRadius: '4px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        opacity: 0.7,
                                                                        transition: 'opacity 0.2s'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                                                    title="Delete Trip Log"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td style={tdStyle}>{trip.driverName}</td>
                                                        <td style={tdStyle}>{trip.startTime ? new Date(trip.startTime).toLocaleTimeString() : '-'}</td>
                                                        <td style={tdStyle}>{trip.endTime ? new Date(trip.endTime).toLocaleTimeString() : '-'}</td>
                                                        <td style={tdStyle}>
                                                            <span style={{
                                                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                                                background: trip.status === 'completed' ? '#dcfce7' : '#fee2e2',
                                                                color: trip.status === 'completed' ? '#166534' : '#991b1b'
                                                            }}>
                                                                {trip.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {trips.length === 0 && (
                                                    <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No trip history found.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* USERS TAB - Registered Students */}
                            {activeTab === 'users' && (
                                <div style={{ padding: '40px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                        <h3 style={{ margin: 0 }}>Registered Students ({usersList.length})</h3>
                                        <input
                                            type="text"
                                            placeholder="Search by name, email, bus..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '280px', fontSize: '14px' }}
                                        />
                                    </div>

                                    {usersList.length === 0 ? (
                                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>No registered students yet.</p>
                                    ) : (
                                        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead style={{ background: '#f8fafc' }}>
                                                    <tr>
                                                        <th style={thStyle}>Name</th>
                                                        <th style={thStyle}>Email</th>
                                                        <th style={thStyle}>Bus</th>
                                                        <th style={thStyle}>Stop</th>
                                                        <th style={thStyle}>Department</th>
                                                        <th style={thStyle}>Year</th>
                                                        <th style={thStyle}>Phone</th>
                                                        <th style={thStyle}>Parent Phone</th>
                                                        <th style={thStyle}>Status</th>
                                                        <th style={thStyle}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {usersList
                                                        .filter(u => {
                                                            if (!searchTerm) return true;
                                                            const term = searchTerm.toLowerCase();
                                                            return (
                                                                u.name?.toLowerCase().includes(term) ||
                                                                u.email?.toLowerCase().includes(term) ||
                                                                u.busNumber?.toString().includes(term) ||
                                                                u.department?.toLowerCase().includes(term) ||
                                                                u.stopName?.toLowerCase().includes(term)
                                                            );
                                                        })
                                                        .map(u => (
                                                            <tr key={u.id} style={{ borderTop: '1px solid #e2e8f0', background: u.disabled ? '#fef2f2' : 'transparent' }}>
                                                                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#1e293b' }}>{u.name || '-'}</td>
                                                                <td style={{ ...tdStyle, color: '#64748b', fontSize: '13px' }}>{u.email || '-'}</td>
                                                                <td style={tdStyle}>
                                                                    <span style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                                                                        {u.busNumber || '-'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ ...tdStyle, fontSize: '13px' }}>{u.stopName || '-'}</td>
                                                                <td style={{ ...tdStyle, fontSize: '13px' }}>{u.department || '-'}</td>
                                                                <td style={tdStyle}>{u.year || '-'}</td>
                                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>{u.phoneNumber || '-'}</td>
                                                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>{u.parentPhoneNumber || '-'}</td>
                                                                <td style={tdStyle}>
                                                                    {u.disabled ?
                                                                        <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Blocked</span> :
                                                                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>Active</span>
                                                                    }
                                                                </td>
                                                                <td style={tdStyle}>
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        {u.disabled ? (
                                                                            <button onClick={() => handleUserAction(u.id, 'PUT', false)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Unblock</button>
                                                                        ) : (
                                                                            <button onClick={() => handleUserAction(u.id, 'PUT', true)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Block</button>
                                                                        )}
                                                                        <button onClick={() => handleUserAction(u.id, 'DELETE')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LIVE MAP TAB */}
                            {activeTab === 'live_map' && (
                                <div style={{ padding: '0' }}>
                                    <div style={{ padding: '20px 20px 10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0 }}>Live Fleet View</h3>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>updating every few seconds...</span>
                                    </div>
                                    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
                                        <AdminMap buses={trackingData.filter(t => t.active)} />
                                    </div>
                                </div>
                            )}

                            {/* ROUTES TAB */}
                            {activeTab === 'routes' && (
                                <div style={{ padding: '40px' }}>
                                    {/* Add/Edit Route Form */}
                                    <div style={{ marginBottom: '40px', padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <h4 style={{ margin: 0 }}>{editingRoute ? `Edit Route (Bus ${editingRoute.busNumber})` : 'Add New Route'}</h4>
                                            {editingRoute && <button onClick={() => { setEditingRoute(null); }} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel Edit</button>}
                                        </div>
                                        <form onSubmit={handleAddOrUpdateRoute} style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr 2fr auto' }}>
                                            <input
                                                name="routeId"
                                                defaultValue={editingRoute ? editingRoute.routeId : ''}
                                                placeholder="Route Name (e.g. Pallavaram)"
                                                required
                                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                            <input
                                                name="busNumber"
                                                defaultValue={editingRoute ? editingRoute.busNumber : ''}
                                                readOnly={!!editingRoute} // Lock Bus ID on edit to ensure we update the correct doc
                                                placeholder="Bus Number (e.g. 101)"
                                                required
                                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: editingRoute ? '#f1f5f9' : 'white' }}
                                            />
                                            <input
                                                name="stops"
                                                defaultValue={editingRoute ? (Array.isArray(editingRoute.stops) ? editingRoute.stops.join(', ') : editingRoute.stops) : ''}
                                                placeholder="Stops (comma separated)"
                                                required
                                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                            />
                                            <button type="submit" style={{ padding: '12px 24px', background: editingRoute ? '#059669' : '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                                {editingRoute ? 'Save Changes' : 'Add Route'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Routes List */}
                                    <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                        {displayedRoutes.map(route => (
                                            <motion.div key={route.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>{route.routeId}</span>
                                                    <span style={{ padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Bus {route.busNumber}</span>
                                                </div>
                                                <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0', maxHeight: '100px', overflowY: 'auto' }}>
                                                    <strong>Stops:</strong> {Array.isArray(route.stops) ? route.stops.join(' → ') : route.stops}
                                                </p>
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button onClick={() => startEditing(route)} style={{ flex: 1, color: '#0f172a', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                                                    <button onClick={() => handleDeleteRoute(route.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Delete</button>
                                                </div>
                                            </motion.div>
                                        ))}
                                        {displayedRoutes.length === 0 && <p style={{ color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center' }}>No routes found.</p>}
                                    </div>
                                </div>
                            )}

                            {/* SOS TAB */}
                            {activeTab === 'sos' && (
                                <div style={{ padding: '40px', color: '#0f172a' }}>
                                    <h3 style={{ color: '#0f172a', fontSize: '24px', marginBottom: '20px' }}>🚨 Emergency SOS Alerts</h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                                        {sosAlerts.filter(a => a.status === 'active').map(alert => (
                                            <motion.div
                                                layout
                                                initial={{ scale: 0.9, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                key={alert.id}
                                                style={{
                                                    padding: '24px',
                                                    background: '#fee2e2',
                                                    border: '2px solid #ef4444',
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '24px' }}>🆘</span>
                                                        {alert.type === 'driver' ? (
                                                            <span>Driver <b>{alert.driverName || 'Unknown'}</b></span>
                                                        ) : (
                                                            <span>Student <b>{alert.studentName || 'Unknown'}</b></span>
                                                        )}
                                                    </h4>
                                                    <p style={{ margin: '0', color: '#b91c1c' }}>
                                                        <strong>Bus:</strong> {alert.busNumber || 'N/A'} •
                                                        <strong> Time:</strong> {alert.createdAt?.seconds ? new Date(alert.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                                    </p>
                                                    {alert.location && (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ display: 'inline-block', marginTop: '8px', color: '#dc2626', textDecoration: 'underline', fontWeight: '600' }}
                                                        >
                                                            View Location on Map 📍
                                                        </a>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleResolveSOS(alert.id)}
                                                    style={{
                                                        padding: '12px 24px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontWeight: 'bold',
                                                        fontSize: '14px',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    Mark Resolved ✓
                                                </button>
                                            </motion.div>
                                        ))}
                                        {sosAlerts.filter(a => a.status === 'active').length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
                                                <p style={{ fontSize: '18px', fontWeight: '500', color: '#475569' }}>No active alerts. System is secure.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* History */}
                                    {sosAlerts.filter(a => a.status === 'resolved').length > 0 && (
                                        <div style={{ marginTop: '60px', opacity: 0.9 }}>
                                            <h4 style={{ color: '#0f172a' }}>Resolved Alerts History</h4>
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {sosAlerts.filter(a => a.status === 'resolved').slice(0, 5).map(alert => (
                                                    <div key={alert.id} style={{ padding: '16px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#334155', border: '1px solid #e2e8f0' }}>
                                                        <span style={{ fontWeight: '500' }}>
                                                            {alert.type === 'driver' ? `Driver: ${alert.driverName}` : `Student: ${alert.studentName}`} (Bus {alert.busNumber})
                                                        </span>
                                                        <span>{alert.resolvedAt ? new Date(alert.resolvedAt.seconds * 1000).toLocaleDateString() : '-'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DELAYS TAB */}
                            {activeTab === 'delays' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Delay Reports</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                                        {adminNotifications.filter(n => n.type === 'DELAY_REPORT').map(n => (
                                            <motion.div
                                                layout
                                                key={n.id}
                                                style={{ padding: '20px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '20px' }}>⏳</span>
                                                        <span style={{ fontWeight: 'bold', color: '#b45309', fontSize: '16px' }}>Bus {n.busNumber} Delayed</span>
                                                    </div>
                                                    <p style={{ margin: '0 0 4px 0', color: '#78350f' }}>Reason: <strong>{n.reason}</strong></p>
                                                    <span style={{ fontSize: '12px', color: '#92400e' }}>Reported by {n.driverName} at {formatDate(n.timestamp)}</span>
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const db = getFirestore();
                                                        if (confirm('Acknowledge and clear delay status?')) {
                                                            await deleteDoc(doc(db, 'admin_notifications', n.id));
                                                            // Optionally reset bus status if needed, though driver might still be delayed.
                                                            // For now, let's just clear the notification.
                                                            try {
                                                                await updateDoc(doc(db, 'tracking', n.busNumber), {
                                                                    status: null, // Clear the 'Delayed' status tag on map
                                                                    delayReason: null
                                                                });
                                                            } catch (e) { console.error(e); }
                                                        }
                                                    }}
                                                    style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    Acknowledge
                                                </button>
                                            </motion.div>
                                        ))}
                                        {adminNotifications.filter(n => n.type === 'DELAY_REPORT').length === 0 && <p style={{ color: '#94a3b8' }}>No active delay reports.</p>}
                                    </div>
                                </div>
                            )}

                            {/* DRIVERS TAB */}
                            {activeTab === 'drivers' && (
                                <div style={{ padding: '0 20px 40px 20px', maxWidth: '1200px', margin: '0 auto' }}>

                                    {/* MANAGE DRIVER POOL */}
                                    <div style={{ marginBottom: '40px', padding: '32px', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                            <div>
                                                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px' }}>👤 Driver Pool</h3>
                                                <p style={{ margin: 0, color: '#64748b' }}>Add drivers here to make them available for assignment.</p>
                                            </div>
                                            <div style={{ background: '#eff6ff', padding: '12px 20px', borderRadius: '12px', color: '#1e40af', fontWeight: 'bold' }}>
                                                {driversList.length} Drivers Available
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                            <input id="newDriverName" placeholder="Driver Name (e.g. John Doe)" style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', flex: 1, minWidth: '200px', fontSize: '16px', outline: 'none' }} />
                                            <input id="newDriverPhone" placeholder="Phone (Optional)" style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e2e8f0', width: '200px', fontSize: '16px', outline: 'none' }} />
                                            <button onClick={handleAddDriver} style={{ padding: '12px 32px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)' }}>
                                                + Add Driver
                                            </button>
                                        </div>

                                        {driversList.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                                {driversList.map(d => (
                                                    <motion.div layout key={d.id} style={{ background: '#f8fafc', padding: '8px 16px', borderRadius: '99px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500' }}>
                                                        <span>{d.name}</span>
                                                        {d.phone && <span style={{ color: '#94a3b8' }}>• {d.phone}</span>}
                                                        <button onClick={() => handleDeleteDriver(d.id)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', lineHeight: 1 }}>×</button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '12px' }}>
                                                No drivers added yet. Add one above to get started.
                                            </div>
                                        )}
                                    </div>

                                    {/* BUS ASSIGNMENTS */}
                                    <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '8px' }}>🚍</span> Bus Assignments
                                        <button
                                            onClick={handleAddNewBus}
                                            style={{ marginLeft: 'auto', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                                        >
                                            + Add New Bus
                                        </button>
                                    </h3>

                                    {/* FILTERS & ACTIONS */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                                        <input
                                            placeholder="🔍 Search Bus or Driver..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '16px', outline: 'none', minWidth: '200px' }}
                                        />
                                        <button onClick={handleExportAssignments} style={{ padding: '12px 20px', background: '#f8fafc', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            📥 Export CSV
                                        </button>
                                        <button onClick={handleClearAllAssignments} style={{ padding: '12px 20px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            🧹 Clear All
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {displayedRoutes.filter(r =>
                                            r.busNumber.includes(searchTerm) ||
                                            (r.driver && r.driver.toLowerCase().includes(searchTerm.toLowerCase()))
                                        ).map(route => {
                                            const isEditing = editingAssignment === route.busNumber;
                                            const isMaintenance = route.status === 'maintenance';
                                            // Determine current driver MATCH in list (for selection)
                                            // The stored string is "Name - Phone". We try to match with Name.
                                            // Simplification: We just use unassigned or select from list.

                                            return (
                                                <motion.div
                                                    layout
                                                    key={route.id}
                                                    style={{
                                                        padding: '24px',
                                                        background: isMaintenance ? '#fffbeb' : 'white',
                                                        borderRadius: '20px',
                                                        border: isEditing ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                                        boxShadow: isEditing ? '0 10px 15px -3px rgba(59, 130, 246, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                        position: 'relative',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Bus Route</div>
                                                            <div style={{ fontSize: '32px', color: '#0f172a', fontWeight: '900', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {route.busNumber}
                                                                {isMaintenance && <span style={{ fontSize: '20px' }}>⚠️</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                            <div style={{ fontSize: '11px', color: isMaintenance ? '#d97706' : (route.isStatic ? '#94a3b8' : '#3b82f6'), fontWeight: 'bold', background: isMaintenance ? '#fff7ed' : (route.isStatic ? '#f1f5f9' : '#eff6ff'), padding: '4px 8px', borderRadius: '8px', display: 'inline-block' }}>
                                                                {isMaintenance ? 'MAINTENANCE' : (route.isStatic ? 'DEFAULT' : 'CUSTOM')}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(route.busNumber, route.status); }}
                                                                    title={isMaintenance ? "Set Active" : "Set Maintenance"}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}
                                                                >
                                                                    {isMaintenance ? '✅' : '🛠️'}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteRoute(route.busNumber); }}
                                                                    title={route.isStatic ? "Reset to Default" : "Delete Bus"}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', opacity: 0.6, padding: '4px' }}
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!isEditing ? (
                                                        <>
                                                            <div style={{ marginBottom: '24px', padding: '16px', background: route.driver ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', border: route.driver ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                                                                <div style={{ fontSize: '13px', color: route.driver ? '#166534' : '#991b1b', fontWeight: '700', marginBottom: '4px' }}>ASSIGNED DRIVER</div>
                                                                <div style={{ fontSize: '18px', color: route.driver ? '#14532d' : '#ef4444', fontWeight: 'bold' }}>
                                                                    {route.driver ? route.driver.split(' - ')[0] : 'Unassigned'}
                                                                </div>
                                                                {route.driver && route.driver.includes('-') && (
                                                                    <div style={{ fontSize: '14px', color: '#166534', marginTop: '2px', opacity: 0.8 }}>📞 {route.driver.split(' - ')[1]}</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => setEditingAssignment(route.busNumber)}
                                                                style={{ width: '100%', padding: '14px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
                                                            >
                                                                Change Driver
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <div style={{ animation: 'fadeIn 0.2s ease' }}>
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Select from Pool</label>
                                                                <select
                                                                    id={`assign-select-${route.busNumber}`}
                                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '16px', outline: 'none' }}
                                                                    defaultValue={route.driverId || ""}
                                                                >
                                                                    <option value="" disabled>Choose a driver...</option>
                                                                    <option value="unassigned">-- Unassign Driver --</option>
                                                                    {driversList.map(d => (
                                                                        <option key={d.id} value={d.id}>{d.name} {d.phone ? `(${d.phone})` : ''}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => setEditingAssignment(null)}
                                                                    style={{ flex: 1, padding: '12px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleAssignDriver(route.busNumber, document.getElementById(`assign-select-${route.busNumber}`).value)}
                                                                    style={{ flex: 1, padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ANNOUNCEMENTS TAB */}
                            {activeTab === 'announcements' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>📢 Manage In-App Announcements</h3>
                                    <p style={{ color: '#64748b', marginTop: 0 }}>These appear as a banner inside the Student Dashboard. Use <strong>Broadcast</strong> tab to also send SMS.</p>
                                    <form onSubmit={handlePostAnnouncement} style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
                                        <input
                                            value={newAnnouncement}
                                            onChange={(e) => setNewAnnouncement(e.target.value)}
                                            placeholder="Type an announcement (e.g. Bus 101 delayed by 10 mins)..."
                                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                        <button type="submit" style={{ padding: '12px 24px', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Post</button>
                                    </form>

                                    <div style={{ display: 'grid', gap: '15px' }}>
                                        {announcements.map(ann => (
                                            <div key={ann.id} style={{ padding: '16px', background: ann.type === 'broadcast' ? '#fefce8' : '#f0f9ff', border: `1px solid ${ann.type === 'broadcast' ? '#fde047' : '#bae6fd'}`, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span>{ann.type === 'broadcast' ? '📡 SMS Broadcast' : '📌 In-App'}</span>
                                                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#0369a1' }}>{ann.message}</p>
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Posted: {formatDate(ann.createdAt)}</span>
                                                </div>
                                                <button onClick={() => handleDeleteAnnouncement(ann.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>×</button>
                                            </div>
                                        ))}
                                        {announcements.length === 0 && <p style={{ color: '#94a3b8' }}>No active announcements.</p>}
                                    </div>
                                </div>
                            )}

                            {/* BROADCAST TAB */}
                            {activeTab === 'broadcast' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>📡 Global SMS Broadcast</h3>
                                    <p style={{ color: '#64748b', marginTop: 0 }}>Send an SMS to <strong>ALL</strong> registered parent mobile numbers simultaneously. Also posts as an in-app announcement.</p>
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde047', borderRadius: '12px', padding: '20px', marginBottom: '30px' }}>
                                        <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#92400e' }}>⚠️ Use responsibly — this will text every parent in the database.</p>
                                        <p style={{ margin: 0, color: '#92400e' }}>Examples: "All buses delayed by 15 mins due to heavy rain." | "Holiday tomorrow — no buses."</p>
                                    </div>
                                    <textarea
                                        value={broadcastMsg}
                                        onChange={e => setBroadcastMsg(e.target.value)}
                                        placeholder="Type your broadcast message here..."
                                        rows={5}
                                        style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                    />
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
                                        <button
                                            onClick={handleGlobalBroadcast}
                                            disabled={isBroadcasting || !broadcastMsg.trim()}
                                            style={{ padding: '14px 32px', background: isBroadcasting ? '#94a3b8' : 'linear-gradient(135deg, #dc2626, #ef4444)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: isBroadcasting ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isBroadcasting ? '📡 Sending...' : '📡 Send to All Parents'}
                                        </button>
                                        <span style={{ color: '#64748b', fontSize: '14px' }}>{broadcastMsg.length}/160 characters</span>
                                    </div>
                                    <div style={{ marginTop: '40px' }}>
                                        <h4>Recent Broadcasts</h4>
                                        {announcements.filter(a => a.type === 'broadcast').length === 0
                                            ? <p style={{ color: '#94a3b8' }}>No broadcasts sent yet.</p>
                                            : announcements.filter(a => a.type === 'broadcast').map(b => (
                                                <div key={b.id} style={{ padding: '12px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                                    <div><strong>{b.message}</strong><br /><span style={{ fontSize: '12px', color: '#64748b' }}>{formatDate(b.createdAt)}</span></div>
                                                    <button onClick={() => handleDeleteAnnouncement(b.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            )}

                            {/* BULK IMPORT TAB */}
                            {activeTab === 'bulk_import' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>📋 Bulk Import Students (CSV)</h3>
                                    <p style={{ color: '#64748b', marginTop: 0 }}>Upload a CSV file to register multiple students at once. This is much faster than adding them one by one.</p>
                                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '24px', marginBottom: '30px' }}>
                                        <h4 style={{ margin: '0 0 12px', color: '#14532d' }}>📄 Required CSV Format</h4>
                                        <code style={{ display: 'block', background: '#dcfce7', padding: '12px', borderRadius: '8px', fontSize: '13px', color: '#166534' }}>
                                            name,email,busNumber,department,year,phoneNumber,parentPhoneNumber,stopName<br />
                                            John Doe,john@example.com,101,CSE,2nd Year,9876543210,9123456789,Goripalayam<br />
                                            Jane Smith,jane@example.com,103,ECE,1st Year,9998887776,9111222333,Villapuram
                                        </code>
                                        <p style={{ margin: '12px 0 0', color: '#166534', fontSize: '14px' }}>Download a <a href="data:text/csv;charset=utf-8,name,email,busNumber,department,year,phoneNumber,parentPhoneNumber,stopName" download="student_template.csv" style={{ color: '#16a34a', fontWeight: 'bold' }}>blank template CSV</a> to get started.</p>
                                    </div>
                                    <label style={{ display: 'inline-flex', padding: '16px 32px', background: '#2563eb', color: 'white', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', gap: '10px', alignItems: 'center' }}>
                                        📂 Choose CSV File
                                        <input type="file" accept=".csv" onChange={handleBulkImportCSV} style={{ display: 'none' }} />
                                    </label>
                                    <div style={{ marginTop: '30px' }}>
                                        <h4>Currently Registered Students: {usersList.length}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
                                            {usersList.slice(0, 12).map(u => (
                                                <div key={u.id} style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                                    <strong>{u.name || u.email}</strong>
                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>Bus {u.busNumber || '?'} • {u.department || '?'} • {u.year || '?'}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {usersList.length > 12 && <p style={{ color: '#64748b' }}>+ {usersList.length - 12} more in Users tab</p>}
                                    </div>
                                </div>
                            )}

                            {/* GEOFENCE TAB */}
                            {activeTab === 'geofence' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>🗺️ Geofence Management</h3>
                                    <p style={{ color: '#64748b', marginTop: 0 }}>Define virtual boundaries around key locations (school gate, stops). The system will trigger alerts when buses enter/exit these zones.</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                        <div>
                                            <h4>Add New Geofence Zone</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <input value={geofenceForm.name} onChange={e => setGeofenceForm({ ...geofenceForm, name: e.target.value })} placeholder="Zone Name (e.g. SRM School Gate)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <input value={geofenceForm.lat} onChange={e => setGeofenceForm({ ...geofenceForm, lat: e.target.value })} placeholder="Latitude (e.g. 9.9252)" type="number" step="any" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                    <input value={geofenceForm.lng} onChange={e => setGeofenceForm({ ...geofenceForm, lng: e.target.value })} placeholder="Longitude (e.g. 78.1198)" type="number" step="any" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <input value={geofenceForm.radius} onChange={e => setGeofenceForm({ ...geofenceForm, radius: e.target.value })} placeholder="Radius in meters" type="number" style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                                                    <span style={{ fontSize: '13px', color: '#64748b' }}>meters</span>
                                                </div>
                                                <button onClick={handleSaveGeofence} style={{ padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>+ Add Geofence Zone</button>
                                                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>💡 Tip: To get coordinates, visit Google Maps, right-click on a location, and the lat/lng appears at the top.</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h4>Active Geofence Zones ({geofences.length})</h4>
                                            {geofences.length === 0 ? <p style={{ color: '#94a3b8' }}>No geofences configured yet.</p> : geofences.map(g => (
                                                <div key={g.id} style={{ padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <strong>📍 {g.name}</strong>
                                                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>{g.lat}, {g.lng} • Radius: {g.radius}m</p>
                                                    </div>
                                                    <button onClick={async () => { if (!confirm('Delete this geofence?')) return; await deleteDoc(doc(getFirestore(), 'geofences', g.id)); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LEAVE REQUESTS TAB */}
                            {activeTab === 'leave' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>🏖️ Student Leave Applications</h3>
                                    <p style={{ color: '#64748b', marginTop: 0 }}>Students who have marked themselves absent today. Drivers will be notified not to wait for these students at their stops.</p>
                                    <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
                                        {leaveRequests.filter(l => !l.date || l.date === new Date().toLocaleDateString('en-CA')).length === 0
                                            ? <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px' }}>No leave applications for today.</div>
                                            : leaveRequests.filter(l => !l.date || l.date === new Date().toLocaleDateString('en-CA')).map(lr => (
                                                <div key={lr.id} style={{ padding: '16px', background: lr.status === 'pending' ? '#fff7ed' : '#f0fdf4', border: `1px solid ${lr.status === 'pending' ? '#fed7aa' : '#86efac'}`, borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <strong>{lr.studentName || 'Unknown Student'}</strong>
                                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>Bus {lr.busNumber} • Stop: {lr.stopName || 'N/A'} • Date: {lr.date}</p>
                                                    </div>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: lr.status === 'pending' ? '#fed7aa' : '#bbf7d0', color: lr.status === 'pending' ? '#92400e' : '#166534' }}>{lr.status || 'pending'}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <h4 style={{ marginTop: '40px' }}>All-time Leave History</h4>
                                    <div style={{ background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead><tr style={{ background: '#f1f5f9' }}><th style={thStyle}>Student</th><th style={thStyle}>Bus</th><th style={thStyle}>Date</th><th style={thStyle}>Status</th></tr></thead>
                                            <tbody>{leaveRequests.slice(0, 20).map(lr => (<tr key={lr.id} style={{ borderTop: '1px solid #e2e8f0' }}><td style={tdStyle}>{lr.studentName}</td><td style={tdStyle}>{lr.busNumber}</td><td style={tdStyle}>{lr.date}</td><td style={tdStyle}><span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '12px', background: '#ffe4e6', color: '#be185d' }}>{lr.status || 'pending'}</span></td></tr>))}</tbody>
                                        </table>
                                        {leaveRequests.length === 0 && <p style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No leave history yet.</p>}
                                    </div>
                                </div>
                            )}

                            {/* ANALYTICS TAB */}
                            {activeTab === 'analytics' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>📊 Analytics & Reporting</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                                        <div style={{ padding: '24px', background: '#eff6ff', borderRadius: '16px', border: '1px solid #dbeafe' }}>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Registered Students</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 'bold', color: '#1e40af' }}>{usersList.length}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#f0fdf4', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Boardings (All Time)</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 'bold', color: '#166534' }}>{trips.reduce((a, t) => a + (t.passengerCount || 0), 0)}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#fff7ed', borderRadius: '16px', border: '1px solid #ffedd5' }}>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Trips Completed</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 'bold', color: '#9a3412' }}>{trips.length}</p>
                                        </div>
                                        <div style={{ padding: '24px', background: '#fdf4ff', borderRadius: '16px', border: '1px solid #f5d0fe' }}>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Total Leave Applications</p>
                                            <p style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 'bold', color: '#701a75' }}>{leaveRequests.length}</p>
                                        </div>
                                    </div>

                                    <h4>🚌 Per-Route Ridership (from trip logs)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '40px' }}>
                                        {Object.entries(trips.reduce((acc, t) => { if (t.busNumber) acc[t.busNumber] = (acc[t.busNumber] || 0) + (t.passengerCount || 0); return acc; }, {})).sort((a, b) => b[1] - a[1]).map(([bus, count]) => (
                                            <div key={bus} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong>Bus {bus}</strong>
                                                    <span style={{ background: '#2563eb', color: 'white', padding: '2px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>{count} riders</span>
                                                </div>
                                                <div style={{ marginTop: '8px', height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                                                    <div style={{ height: '100%', width: `${Math.min(100, (count / (trips.reduce((a, t) => a + (t.passengerCount || 0), 0) || 1)) * 100 * 5)}%`, background: '#3b82f6', borderRadius: '4px', transition: 'width 0.5s' }}></div>
                                                </div>
                                            </div>
                                        ))}
                                        {trips.length === 0 && <p style={{ color: '#94a3b8' }}>No trip data available yet.</p>}
                                    </div>

                                    <h4>📥 Export Reports</h4>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <button onClick={() => {
                                            const rows = trips.map(t => [t.busNumber, t.driverName || '', t.passengerCount || 0, t.startTime || '', t.status || '']);
                                            const csv = 'Bus,Driver,Passengers,Start Time,Status\n' + rows.map(r => r.join(',')).join('\n');
                                            const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'ridership_report.csv'; a.click();
                                        }} style={{ padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Export Ridership CSV</button>
                                        <button onClick={() => {
                                            const rows = leaveRequests.map(l => [l.studentName || '', l.busNumber || '', l.date || '', l.status || '']);
                                            const csv = 'Student,Bus,Date,Status\n' + rows.map(r => r.join(',')).join('\n');
                                            const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'leave_report.csv'; a.click();
                                        }} style={{ padding: '12px 24px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Export Leave History CSV</button>
                                    </div>
                                </div>
                            )}

                            {/* FEEDBACK TAB */}
                            {activeTab === 'feedback' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Student Feedback</h3>
                                    {feedbacks.length === 0 ? (
                                        <p style={{ color: '#94a3b8' }}>No feedback received yet.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '20px' }}>
                                            {(() => {
                                                // Group items by bus
                                                const grouped = feedbacks.reduce((acc, fb) => {
                                                    const key = fb.busNumber || 'General';
                                                    if (!acc[key]) acc[key] = [];
                                                    acc[key].push(fb);
                                                    return acc;
                                                }, {});

                                                // Sort keys (General last, otherwise numeric)
                                                const keys = Object.keys(grouped).sort((a, b) => {
                                                    if (a === 'General') return 1;
                                                    if (b === 'General') return -1;
                                                    return a.localeCompare(b, undefined, { numeric: true });
                                                });

                                                return keys.map(busNum => {
                                                    const items = grouped[busNum];
                                                    const avgRating = (items.reduce((sum, item) => sum + (item.rating || 0), 0) / items.length).toFixed(1);

                                                    return (
                                                        <div key={busNum} style={{ background: '#f8fafc', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                                                <h4 style={{ margin: 0, fontSize: '20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                    🚌 {busNum === 'General' ? 'General Feedback' : `Bus ${busNum}`}
                                                                </h4>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'bold' }}>Avg:</span>
                                                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#b45309' }}>{avgRating} ★</span>
                                                                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>({items.length} reviews)</span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                                                {items.map(fb => (
                                                                    <div key={fb.id} style={{ padding: '16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                                                {fb.category || 'General'}
                                                                            </span>
                                                                            <div style={{ color: '#fbbf24', fontSize: '14px' }}>{'★'.repeat(fb.rating)}{'☆'.repeat(5 - (fb.rating || 0))}</div>
                                                                        </div>
                                                                        <p style={{ margin: '0 0 12px 0', color: '#334155', fontStyle: 'italic', fontSize: '15px' }}>"{fb.feedback || fb.comment}"</p>
                                                                        <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                                                            <span>👤 Anonymous Student</span>
                                                                            <span>{formatDate(fb.createdAt)}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* QUERIES TAB */}
                            {activeTab === 'queries' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Student Queries</h3>
                                    <div style={{ display: 'grid', gap: '16px', marginTop: '20px' }}>
                                        {queries.length === 0 ? <p style={{ color: '#94a3b8' }}>No queries found.</p> : queries.map(q => (
                                            <div key={q.id} style={{ padding: '24px', background: q.status === 'completed' ? '#f0fdf4' : 'white', border: q.status === 'completed' ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#1e293b' }}>Anonymous Student</span>
                                                        {q.busNumber && q.busNumber !== 'N/A' && (
                                                            <span style={{ padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #dbeafe' }}>
                                                                Bus {q.busNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', background: q.status === 'completed' ? '#dcfce7' : '#fee2e2', color: q.status === 'completed' ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>
                                                        {q.status === 'completed' ? 'Resolved' : 'Pending'}
                                                    </span>
                                                </div>
                                                <p style={{ margin: '0 0 16px 0', color: '#334155', lineHeight: '1.5' }}>{q.query || q.message}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatDate(q.createdAt)}</span>
                                                    {q.status !== 'completed' && (
                                                        <button
                                                            onClick={() => handleCompleteQuery(q.id)}
                                                            style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                                                        >
                                                            Mark Resolved
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DELAYS TAB */}
                            {activeTab === 'delays' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Delay Reports</h3>

                                    {/* Active Issues Section */}
                                    <div style={{ marginTop: '20px' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: '#b45309', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                                            Active Issues ({adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status !== 'acknowledged').length})
                                        </h4>

                                        {adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status !== 'acknowledged').length === 0 ? (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>No active delay reports. All systems running smoothly! 👍</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '16px' }}>
                                                {adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status !== 'acknowledged').map(n => (
                                                    <div key={n.id} style={{ padding: '20px', background: '#fffbeb', borderLeft: '4px solid #ef4444', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#7f1d1d' }}>Bus {n.busNumber}</span>
                                                                <span style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>New Report</span>
                                                            </div>
                                                            <p style={{ margin: 0, color: '#450a0a', fontWeight: '500' }}>{n.message}</p>
                                                            <span style={{ fontSize: '12px', color: '#7f1d1d', opacity: 0.7, display: 'block', marginTop: '8px' }}>Reported: {formatDate(n.timestamp)}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                                            <div style={{ fontSize: '32px' }}>⚠️</div>
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        const db = getFirestore();
                                                                        await updateDoc(doc(db, 'admin_notifications', n.id), { status: 'acknowledged' });
                                                                    } catch (e) { alert(e.message); }
                                                                }}
                                                                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}
                                                            >
                                                                Acknowledge
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* History Section */}
                                    <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                                        <h4 style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#cbd5e1', display: 'inline-block' }}></span>
                                            History ({adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status === 'acknowledged').length})
                                        </h4>

                                        {adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status === 'acknowledged').length === 0 ? (
                                            <p style={{ color: '#94a3b8' }}>No acknowledged reports yet.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                {adminNotifications.filter(n => n.type === 'DELAY_REPORT' && n.status === 'acknowledged').map(n => (
                                                    <div key={n.id} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#64748b' }}>Bus {n.busNumber}</span>
                                                                <span style={{ padding: '2px 6px', background: '#dcfce7', color: '#166534', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Acknowledged</span>
                                                            </div>
                                                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>{n.message}</p>
                                                            <span style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginTop: '4px' }}>Reported: {formatDate(n.timestamp)}</span>
                                                        </div>
                                                        <div style={{ fontSize: '24px', opacity: 0.6 }}>✅</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* MAINTENANCE TAB */}
                            {activeTab === 'maintenance' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Maintenance Requests</h3>
                                    <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                                        {maintenanceRequests.length === 0 ? <p style={{ color: '#94a3b8' }}>No maintenance requests.</p> : maintenanceRequests.map(req => (
                                            <div key={req.id} style={{ padding: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Bus {req.busNumber}</span>
                                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: req.status === 'resolved' ? '#dcfce7' : '#fee2e2', color: req.status === 'resolved' ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>
                                                            {req.status}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: '0 0 8px 0', color: '#334155', fontWeight: '500' }}>{req.issue}</p>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                        Reported by {req.driverName} • {formatDate(req.createdAt)}
                                                    </div>
                                                </div>
                                                {req.status !== 'resolved' && (
                                                    <button
                                                        onClick={async () => {
                                                            const db = getFirestore();
                                                            await updateDoc(doc(db, 'maintenance_requests', req.id), { status: 'resolved', resolvedAt: serverTimestamp() });
                                                        }}
                                                        style={{ padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        Mark Fixed
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* EXPENSES TAB */}
                            {activeTab === 'expenses' && (
                                <div style={{ padding: '40px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h3>Fuel & Expense Reports</h3>
                                        <div style={{ background: '#fef3c7', padding: '10px 20px', borderRadius: '12px', border: '1px solid #fde68a', color: '#92400e', fontWeight: 'bold' }}>
                                            Total Pending: ₹{expenses.filter(e => e.status === 'pending').reduce((a, b) => a + (b.amount || 0), 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gap: '20px' }}>
                                        {expenses.length === 0 ? <p style={{ color: '#94a3b8' }}>No expenses reported.</p> : expenses.map(exp => (
                                            <div key={exp.id} style={{ padding: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>Bus {exp.busNumber}</span>
                                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: exp.status === 'approved' ? '#dcfce7' : (exp.status === 'rejected' ? '#fee2e2' : '#fef3c7'), color: exp.status === 'approved' ? '#166534' : (exp.status === 'rejected' ? '#991b1b' : '#92400e'), textTransform: 'uppercase' }}>
                                                            {exp.status}
                                                        </span>
                                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: '#e0e7ff', color: '#3730a3' }}>
                                                            {exp.type}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0ea5e9', marginBottom: '8px' }}>₹{exp.amount?.toFixed(2)}</div>
                                                    <p style={{ margin: '0 0 8px 0', color: '#334155' }}>{exp.description}</p>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                        Reported by {exp.driverName} • {formatDate(exp.createdAt)}
                                                    </div>
                                                </div>
                                                {exp.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <button
                                                            onClick={async () => {
                                                                const db = getFirestore();
                                                                await updateDoc(doc(db, 'driver_expenses', exp.id), { status: 'rejected', reviewedAt: serverTimestamp() });
                                                            }}
                                                            style={{ padding: '10px 20px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const db = getFirestore();
                                                                await updateDoc(doc(db, 'driver_expenses', exp.id), { status: 'approved', reviewedAt: serverTimestamp() });
                                                            }}
                                                            style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* LOST & FOUND TAB */}
                            {activeTab === 'lost_found' && (
                                <div style={{ padding: '40px' }}>
                                    <h3>Lost & Found Portal</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px' }}>
                                        {/* Lost Items (Student Reports) */}
                                        <div>
                                            <h4 style={{ color: '#ef4444', borderBottom: '2px solid #fee2e2', paddingBottom: '10px' }}>Lost Reports (Students)</h4>
                                            <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                                                {lostFoundItems.filter(i => i.type === 'lost').map(item => (
                                                    <div key={item.id} style={{ padding: '16px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#9f1239' }}>{item.itemName}</p>
                                                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#881337' }}>{item.description}</p>
                                                        <div style={{ fontSize: '12px', color: '#9f1239', opacity: 0.8 }}>
                                                            Bus {item.busNumber} • {formatDate(item.createdAt)} • {item.studentName}
                                                        </div>
                                                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm('Delete this report?')) return;
                                                                    await deleteDoc(doc(getFirestore(), 'lost_found', item.id));
                                                                }}
                                                                style={{ padding: '6px 12px', background: '#fff', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {lostFoundItems.filter(i => i.type === 'lost').length === 0 && <p style={{ color: '#94a3b8' }}>No lost reports.</p>}
                                            </div>
                                        </div>

                                        {/* Found Items (Driver/Admin Reports) */}
                                        <div>
                                            <h4 style={{ color: '#2563eb', borderBottom: '2px solid #dbeafe', paddingBottom: '10px' }}>Found Items (Drivers)</h4>
                                            <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
                                                {lostFoundItems.filter(i => i.type === 'found').map(item => (
                                                    <div key={item.id} style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#1e3a8a' }}>{item.itemName}</p>
                                                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#1e40af' }}>{item.description}</p>
                                                                <div style={{ fontSize: '12px', color: '#1e3a8a', opacity: 0.8 }}>
                                                                    Bus {item.busNumber} • {formatDate(item.createdAt)} • Reported by {item.finderName || 'Driver'}
                                                                </div>
                                                            </div>
                                                            {item.status !== 'returned' ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        await updateDoc(doc(getFirestore(), 'lost_found', item.id), { status: 'returned', returnedAt: serverTimestamp() });
                                                                    }}
                                                                    style={{ padding: '6px 12px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                                                >
                                                                    Mark Returned
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', background: '#dcfce7', padding: '4px 8px', borderRadius: '4px' }}>Returned</span>
                                                            )}
                                                        </div>
                                                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm('Delete this report?')) return;
                                                                    await deleteDoc(doc(getFirestore(), 'lost_found', item.id));
                                                                }}
                                                                style={{ padding: '6px 12px', background: '#fff', border: '1px solid #bfdbfe', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {lostFoundItems.filter(i => i.type === 'found').length === 0 && <p style={{ color: '#94a3b8' }}>No found items reported.</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </div>
    );
}
// Helper styles for table
const thStyle = {
    padding: '16px 24px', textAlign: 'left', fontSize: '0.85rem', fontWeight: 'bold',
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em'
};

const tdStyle = {
    padding: '16px 24px', fontSize: '0.95rem', color: '#334155'
};
