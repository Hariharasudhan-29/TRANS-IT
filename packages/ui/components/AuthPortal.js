import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';

export function AuthPortal({
    onAuth,
    appName = 'driver', // 'driver' | 'student'
    driverUrl = 'http://localhost:3000/auth/signin',
    studentUrl = 'http://localhost:3002/auth/signin',
    showAppSwitcher = true
}) {
    const [isSignIn, setIsSignIn] = useState(true);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    // Spotlight Logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const containerRef = useRef(null);

    function handleMouseMove({ currentTarget, clientX, clientY }) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        try {
            await onAuth({
                type: isSignIn ? 'signin' : 'signup',
                email,
                password,
                displayName: isSignIn ? null : displayName
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const inputVariants = {
        focus: { scale: 1.02, borderColor: '#0ea5a4' },
        blur: { scale: 1, borderColor: 'rgba(255,255,255,0.1)' }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-panel"
            style={{
                width: '400px',
                padding: '40px',
                borderRadius: '24px',
                background: 'white',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                color: 'var(--text-primary)',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                zIndex: 1
            }}
            ref={containerRef}
            onMouseMove={handleMouseMove}
        >
            {/* Spotlight Overlay */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: '24px',
                    background: useMotionTemplate`
                        radial-gradient(
                          400px circle at ${mouseX}px ${mouseY}px,
                          rgba(14, 165, 233, 0.15),
                          transparent 80%
                        )
                    `,
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />
            {/* Spotlight Border Boost */}
            <motion.div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '24px',
                    padding: '1px',
                    background: useMotionTemplate`
                        radial-gradient(
                          400px circle at ${mouseX}px ${mouseY}px,
                          rgba(14, 165, 233, 0.5),
                          transparent 80%
                        )
                    `,
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    pointerEvents: 'none',
                    zIndex: 2
                }}
            />

            <div style={{ position: 'relative', zIndex: 10 }}>
                {/* App Switcher Tabs */}
                {showAppSwitcher && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px', background: '#f1f5f9', padding: '4px', borderRadius: '24px', width: 'fit-content', margin: '0 auto 30px auto' }}>
                        <motion.a
                            href={driverUrl}
                            whileHover={{ scale: 1.05 }}
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{
                                padding: '8px 20px',
                                borderRadius: '20px',
                                background: appName === 'driver' ? 'white' : 'transparent',
                                boxShadow: appName === 'driver' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                color: appName === 'driver' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>Driver</div>
                        </motion.a>
                        <motion.a
                            href={studentUrl}
                            whileHover={{ scale: 1.05 }}
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{
                                padding: '8px 20px',
                                borderRadius: '20px',
                                background: appName === 'student' ? 'white' : 'transparent',
                                boxShadow: appName === 'student' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                color: appName === 'student' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>Student</div>
                        </motion.a>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <motion.h2
                        key={isSignIn ? 'signin' : 'signup'}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}
                    >
                        {isSignIn ? 'Welcome Back' : 'Join Trans-It'}
                    </motion.h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                        {isSignIn ? 'Enter your credentials to access your account' : 'Start your journey with us today'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <AnimatePresence mode="wait">
                        {!isSignIn && (
                            <motion.input
                                key="name"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                placeholder="Full Name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="cyber-input"
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}
                                required
                            />
                        )}
                    </AnimatePresence>

                    <motion.input
                        whileFocus="focus"
                        variants={inputVariants}
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                        required
                    />

                    <motion.input
                        whileFocus="focus"
                        variants={inputVariants}
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}
                        required
                    />

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="btn-primary"
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: 'none',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '16px',
                            marginTop: '10px',
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            width: '100%'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : (isSignIn ? 'Sign In' : 'Create Account')}
                    </motion.button>

                    <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        <span style={{ padding: '0 10px', color: '#94a3b8', fontSize: '12px' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: '#f8fafc' }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => onAuth({ type: 'google' })}
                        style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            background: 'white',
                            color: '#1e293b',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            width: '100%'
                        }}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="Google" />
                        Continue with Google
                    </motion.button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '20px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {isSignIn ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => setIsSignIn(!isSignIn)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0
                        }}
                    >
                        {isSignIn ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
