import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';
import { initFirebase } from '../firebaseClient';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminLogin() {
    initFirebase();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const auth = getAuth();
        try {
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (signInError) {
                const isAuthError = signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-login-credentials';

                if (isAuthError && email.toLowerCase() === 'admin@transit.com') {
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                    } catch (createError) {
                        if (createError.code === 'auth/email-already-in-use') {
                            throw new Error('Incorrect password.');
                        } else {
                            throw createError;
                        }
                    }
                } else {
                    throw signInError;
                }
            }

            const user = auth.currentUser;
            if (user && user.email.toLowerCase() !== 'admin@transit.com') {
                await auth.signOut();
                setError('Access Denied: Not authorized.');
                setLoading(false);
                return;
            }

            router.replace('/admin');
        } catch (err) {
            console.error(err);
            if (err.message === 'Incorrect password.' || err.code === 'auth/wrong-password') {
                setError('Incorrect password.');
            } else if (err.code === 'auth/admin-restricted-operation') {
                setError('Registration disabled by project settings.');
            } else if (err.code === 'auth/invalid-login-credentials') {
                setError('Invalid credentials.');
            } else {
                setError('Login failed: ' + (err.message || err.code));
            }
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            fontFamily: '"Outfit", sans-serif',
            color: 'white',
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Ambient Background Animations */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 8, repeat: Infinity }}
                style={{
                    position: 'absolute', top: '-20%', left: '-10%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: 0
                }}
            />
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                style={{
                    position: 'absolute', bottom: '-20%', right: '-10%',
                    width: '500px', height: '500px',
                    background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: 0
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: 'spring' }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '40px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', // Deep shadow
                    zIndex: 1,
                    position: 'relative'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', boxShadow: '0 10px 20px rgba(14, 165, 233, 0.3)' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </motion.div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admin Login</h1>
                    <p style={{ color: '#94a3b8' }}>Secure Access Restricted</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#fca5a5',
                            padding: '12px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            marginBottom: '20px',
                            textAlign: 'center',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: '600' }}>Email Address</label>
                        <motion.input
                            whileFocus={{ scale: 1.02, borderColor: '#38bdf8', boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.1)' }}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            required
                            style={{
                                width: '100%', padding: '14px', borderRadius: '14px',
                                border: '1px solid #475569', background: '#1e293b', color: 'white', outline: 'none', transition: 'all 0.2s'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#cbd5e1', fontSize: '0.9rem', fontWeight: '600' }}>Password</label>
                        <motion.input
                            whileFocus={{ scale: 1.02, borderColor: '#38bdf8', boxShadow: '0 0 0 4px rgba(56, 189, 248, 0.1)' }}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            style={{
                                width: '100%', padding: '14px', borderRadius: '14px',
                                border: '1px solid #475569', background: '#1e293b', color: 'white', outline: 'none', transition: 'all 0.2s'
                            }}
                        />
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
                            * System auto-configures on first login.
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                            background: loading ? '#475569' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                            color: 'white', fontWeight: 'bold', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.5)'
                        }}
                    >
                        {loading ? 'Verifying...' : 'Login to Admin Panel'}
                    </motion.button>
                </form>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <Link href="/" style={{ textDecoration: 'none' }}>
                        <motion.span
                            whileHover={{ color: '#7dd3fc' }}
                            style={{ color: '#38bdf8', fontSize: '1rem', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                            <span>←</span> Back to Driver Home
                        </motion.span>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
