import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export default function SlideButton({ onSlideSuccess, type = 'end', label, successLabel }) {
    const x = useMotionValue(0);
    const [containerWidth, setContainerWidth] = useState(300);
    const containerRef = useRef(null);
    const [isCompleted, setIsCompleted] = useState(false);

    // Calculate max drag distance (container width - handle width - padding)
    const maxDrag = containerWidth - 60; // 52px handle + 8px padding

    // Smooth transitions for opacity
    const backgroundOpacity = useTransform(x, [0, maxDrag * 0.5, maxDrag], [1, 0.5, 0]);
    const successOpacity = useTransform(x, [maxDrag * 0.6, maxDrag], [0, 1]);
    const fillWidth = useTransform(x, [0, maxDrag], [0, containerWidth]);

    const isStart = type === 'start';
    const mainColor = isStart ? '#10b981' : '#ef4444'; // Green or Red
    const bgColor = isStart ? '#d1fae5' : '#fee2e2'; // Light Green or Light Red
    const successText = successLabel || (isStart ? 'Trip Started! ✓' : 'Trip Ended! ✓');
    const slideText = label || (isStart ? 'Slide to Start Trip »' : 'Slide to End Trip »');
    const icon = isStart ? '▶️' : '🛑';

    // Get container width on mount and resize
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const handleDragEnd = (_, info) => {
        // Reduced threshold to 50% of max drag for easier completion
        const threshold = maxDrag * 0.5;

        if (info.offset.x > threshold) {
            // Slide to completion with smooth animation
            animate(x, maxDrag, {
                type: 'spring',
                stiffness: 300,
                damping: 30
            });
            setIsCompleted(true);
            if (onSlideSuccess) {
                setTimeout(() => onSlideSuccess(), 300);
            }
        } else {
            // Snap back to start with smooth spring
            animate(x, 0, {
                type: 'spring',
                stiffness: 400,
                damping: 30
            });
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '60px',
                background: bgColor,
                borderRadius: '30px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                userSelect: 'none'
            }}
        >
            {/* Background Text */}
            <motion.div style={{
                position: 'absolute',
                opacity: backgroundOpacity,
                color: mainColor,
                fontWeight: '700',
                fontSize: '15px',
                pointerEvents: 'none',
                zIndex: 1,
                letterSpacing: '0.5px'
            }}>
                {slideText}
            </motion.div>

            {/* Success Text */}
            <motion.div style={{
                position: 'absolute',
                opacity: successOpacity,
                color: isStart ? '#166534' : '#991b1b',
                fontWeight: 'bold',
                fontSize: '16px',
                pointerEvents: 'none',
                zIndex: 1
            }}>
                {successText}
            </motion.div>

            {/* Percentage Fill Overlay */}
            <motion.div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: fillWidth,
                    background: isStart
                        ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1))'
                        : 'linear-gradient(90deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1))',
                    zIndex: 0,
                    borderRadius: '30px'
                }}
            />

            {/* Slider Handle */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: maxDrag }}
                dragElastic={0.2}
                dragMomentum={false}
                dragTransition={{
                    power: 0.2,
                    timeConstant: 200,
                    modifyTarget: target => target
                }}
                onDragEnd={handleDragEnd}
                style={{
                    width: '52px',
                    height: '52px',
                    background: `linear-gradient(135deg, ${mainColor}, ${isStart ? '#059669' : '#dc2626'})`,
                    borderRadius: '50%',
                    position: 'absolute',
                    left: '4px',
                    top: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 2,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.3)',
                    x
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ cursor: 'grabbing', scale: 0.98 }}
                animate={{
                    boxShadow: isCompleted
                        ? '0 0 20px rgba(16, 185, 129, 0.6)'
                        : '0 4px 8px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,255,255,0.3)'
                }}
            >
                <span style={{
                    color: 'white',
                    fontSize: '20px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
                }}>
                    {icon}
                </span>
            </motion.div>

            {/* Hint Arrow Animation (only when not dragging) */}
            <motion.div
                style={{
                    position: 'absolute',
                    right: '20px',
                    color: mainColor,
                    fontSize: '24px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    zIndex: 1,
                    opacity: backgroundOpacity
                }}
                animate={{
                    x: [0, 10, 0],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
            >
                »
            </motion.div>
        </div>
    );
}
