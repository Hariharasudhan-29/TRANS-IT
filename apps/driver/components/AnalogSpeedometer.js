import React, { useEffect, useState } from 'react';

const AnalogSpeedometer = ({ speed = 0, size = 280, maxSpeed = 140 }) => {
    // Clamp speed between 0 and maxSpeed
    const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed));

    // Calculate rotation angle
    // -135deg is 0 km/h, 135deg is maxSpeed km/h, total range 270deg
    const rotation = -135 + (clampedSpeed / maxSpeed) * 270;

    return (
        <div style={{
            width: size,
            height: size,
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.01)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '8px solid #f1f5f9',
            marginBottom: '60px'
        }}>
            {/* Speed Arc */}
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                style={{ position: 'absolute', inset: 0, transform: 'rotate(90deg)' }}
            >
                {/* Background Arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={size / 2 - 20}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="20"
                    strokeDasharray={`${(size / 2 - 20) * 2 * Math.PI * 0.75} ${(size / 2 - 20) * 2 * Math.PI}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                />
            </svg>

            {/* Needle */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '4px',
                    height: size / 2 - 40,
                    background: '#ef4444',
                    borderRadius: '4px',
                    transformOrigin: 'bottom center',
                    transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 10
                }}
            >
                {/* Needle Cap */}
                <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '16px',
                    height: '16px',
                    background: '#ef4444',
                    borderRadius: '50%',
                    border: '4px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }} />
            </div>

            {/* Ticks */}
            {[...Array(maxSpeed / 20 + 1)].map((_, i) => {
                const tickValue = i * 20;
                const angle = -135 + (tickValue / maxSpeed) * 270;
                const isMajor = tickValue % 20 === 0;

                return (
                    <div
                        key={tickValue}
                        style={{
                            position: 'absolute',
                            width: '2px',
                            height: '10px',
                            background: '#94a3b8',
                            left: '50%',
                            top: '20px',
                            transformOrigin: `0 ${size / 2 - 20}px`,
                            transform: `translateX(-50%) rotate(${angle}deg)`,
                        }}
                    >
                        {isMajor && (
                            <div style={{
                                position: 'absolute',
                                top: '15px',
                                left: '50%',
                                transform: `translateX(-50%) rotate(${-angle}deg)`,
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#64748b'
                            }}>
                                {tickValue}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Digital Readout */}
            <div style={{ marginTop: '50%', transform: 'translateY(-50%)', textAlign: 'center', zIndex: 5 }}>
                <div style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1, fontFamily: 'monospace', color: '#1e293b' }}>
                    {speed.toFixed(1)}
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>km/h</div>
            </div>
        </div>
    );
};

export default AnalogSpeedometer;
