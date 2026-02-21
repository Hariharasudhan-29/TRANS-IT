import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PreTripModal({ isOpen, onClose, onConfirm }) {
    const [checks, setChecks] = useState({
        fuel: false,
        tires: false,
        brakes: false,
        lights: false,
        documents: false
    });

    const isAllChecked = Object.values(checks).every(Boolean);

    const toggleCheck = (key) => {
        setChecks(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}
            >
                <div style={{
                    background: 'white', borderRadius: '24px', padding: '32px',
                    width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>
                        📋 Pre-Trip Safety Check
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '24px' }}>
                        Please verify the following before starting your trip.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                        {[
                            { id: 'fuel', label: 'Fuel / Battery Level Sufficient' },
                            { id: 'tires', label: 'Tires Condition & Pressure OK' },
                            { id: 'brakes', label: 'Brakes Tested & Functional' },
                            { id: 'lights', label: 'Headlights & Indicators Working' },
                            { id: 'documents', label: 'License & Bus Documents Present' },
                        ].map(item => (
                            <div
                                key={item.id}
                                onClick={() => toggleCheck(item.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px', borderRadius: '12px',
                                    background: checks[item.id] ? '#f0fdf4' : '#f8fafc',
                                    border: `2px solid ${checks[item.id] ? '#22c55e' : '#e2e8f0'}`,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ color: checks[item.id] ? '#22c55e' : '#cbd5e1', fontSize: '20px', fontWeight: 'bold' }}>
                                    {checks[item.id] ? '✓' : '○'}
                                </span>
                                <span style={{ fontWeight: '500', color: checks[item.id] ? '#15803d' : '#475569' }}>
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                background: '#f1f5f9', color: '#64748b', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!isAllChecked}
                            style={{
                                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                background: isAllChecked ? '#10b981' : '#cbd5e1',
                                color: 'white', fontWeight: 'bold',
                                cursor: isAllChecked ? 'pointer' : 'not-allowed',
                                transform: isAllChecked ? 'scale(1)' : 'scale(0.98)',
                                transition: 'all 0.2s'
                            }}
                        >
                            Confirm & Start
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
