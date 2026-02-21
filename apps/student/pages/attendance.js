import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { AnimatedBackground } from '@transit/ui';
import { LucideLogOut } from 'lucide-react';

export default function AttendancePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth Check
    useEffect(() => {
        initFirebase();
        const auth = getAuth();
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) {
                setUser(u);
            } else {
                router.push('/auth/signin');
            }
        });
        return () => unsubscribe();
    }, []);

    // Fetch Attendance Data
    useEffect(() => {
        if (!user) return;
        const db = getFirestore();
        // Remove orderBy to avoid index requirement errors
        const q = query(
            collection(db, 'boardings'),
            where('studentId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort client-side
            data.sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0));
            setAttendance(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching attendance:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit', minute: '2-digit'
        });
    };
    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
        router.push('/auth/signin');
    };

    return (
        <div style={{ minHeight: '100vh', position: 'relative', color: 'white' }}>
            <AnimatedBackground />

            {/* Header */}
            <div className="glass-panel" style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                padding: '15px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 10, borderRadius: 0, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ background: 'white', border: 'none', color: 'var(--primary)', width: '36px', height: '36px', borderRadius: '10px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Go to Dashboard">
                        🏠
                    </button>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>My Attendance</h2>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {user && (
                        <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}> {/* Hide name on very small screens if needed, but flex handles it */}
                            <div style={{ fontSize: '14px', fontWeight: '600' }}>{user.displayName || 'Student'}</div>
                            <div style={{ fontSize: '10px', opacity: 0.7 }}>ID: {user.uid.slice(0, 5)}</div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Logout"
                    >
                        <LucideLogOut size={18} />
                    </button>
                </div>
            </div>

            <div style={{ paddingTop: '100px', paddingBottom: '40px', maxWidth: '600px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px' }}>

                {loading ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#cbd5e1' }}>Loading records...</div>
                ) : attendance.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', borderRadius: '24px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '20px' }}>📅</div>
                        <h3 style={{ margin: '10px 0', color: 'var(--primary)' }}>No Attendance Records</h3>
                        <p style={{ color: '#94a3b8' }}>Your boarding history will appear here once you scan a bus QR code.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {attendance.map((record) => (
                            <div key={record.id} className="glass-panel glass-card-hover" style={{ padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>Bus {record.busNumber}</div>
                                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                                        {formatDate(record.scannedAt)}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)', color: record.status === 'Dropped Off' ? '#4ade80' : '#60a5fa' }}>
                                        {formatTime(record.status === 'Dropped Off' ? record.droppedOffAt : record.scannedAt)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {record.status === 'Dropped Off' ? 'Safe Arrival' : 'On Board'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Find Bus Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                        width: '100%', padding: '16px', marginTop: '20px',
                        background: 'white', color: 'var(--primary)', border: 'none',
                        borderRadius: '16px', fontSize: '16px', fontWeight: 'bold',
                        cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    🔍 Find Your Next Bus
                </button>
            </div>
        </div>
    );
}
