import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (ev) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return (
    <main style={{
      fontFamily: '"Outfit", sans-serif',
      minHeight: '100vh',
      background: `radial-gradient(500px at ${mousePosition.x}px ${mousePosition.y}px, rgba(56, 189, 248, 0.4), transparent 80%), linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      color: 'white'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: '20px', textAlign: 'center', display: 'flex', justifyContent: 'center' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 6v6" />
            <path d="M15 6v6" />
            <path d="M2 12h19.6" />
            <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.3-.1-.6-.2-.9l-2-4.5c-.3-.7-1-1.1-1.8-1.1H5.2c-.8 0-1.5.4-1.8 1.1l-2 4.5c-.1.3-.2.6-.2.9 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3" />
            <path d="M18 18v-5" />
            <path d="M5 18v-5" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
        </motion.div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: '0 0 10px 0', textAlign: 'center', background: 'linear-gradient(to right, #38bdf8, #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Trans-It
        </h1>
        <p style={{ textAlign: 'center', color: '#cbd5e1', marginBottom: '30px', fontSize: '1.1rem' }}>
          Driver Companion App
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <Link href="/auth/signin" style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(56, 189, 248, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center',
                fontWeight: '600',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              Driver Login
            </motion.div>
          </Link>

          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <motion.div
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: 'transparent',
                padding: '12px',
                borderRadius: '12px',
                textAlign: 'center',
                fontWeight: '500',
                color: '#94a3b8',
                fontSize: '0.9rem',
                border: '1px dashed rgba(148, 163, 184, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              🔒 Admin Access
            </motion.div>
          </Link>
        </div>

        <p style={{ marginTop: 30, textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>
          Optimized for Safety & Efficiency
        </p>
      </motion.div>
    </main >
  );
}
