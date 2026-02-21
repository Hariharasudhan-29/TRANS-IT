import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue with optimized loading
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Optimized MapRecenter with reduced animation time
function MapRecenter({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 13, { duration: 0.5 }); // Faster animation
        }
    }, [lat, lng, map]);
    return null;
}

export default function Map({ busLocation, busNumber, destination, userLocation, stops = [] }) {
    // Default to Vels University (Chennai) if no location
    const defaultCenter = [12.957952, 80.160793];

    // Check if we have valid coordinates
    const hasValidLocation = busLocation &&
        typeof busLocation.lat === 'number' &&
        typeof busLocation.lng === 'number';

    const position = hasValidLocation ? [busLocation.lat, busLocation.lng] : defaultCenter;
    const destPosition = (destination && typeof destination.lat === 'number' && typeof destination.lng === 'number') ? [destination.lat, destination.lng] : null;
    const userPos = (userLocation && userLocation.lat && userLocation.lng) ? [userLocation.lat, userLocation.lng] : null;

    const [routePath, setRoutePath] = useState(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // Fetch Route from OSRM with debouncing
    useEffect(() => {
        if (!hasValidLocation || !destPosition) {
            setRoutePath(null);
            return;
        }

        const fetchRoute = async () => {
            setIsLoadingRoute(true);
            try {
                // OSRM Public API (Demo server)
                const url = `https://router.project-osrm.org/route/v1/driving/${busLocation.lng},${busLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

                const response = await fetch(url);
                const data = await response.json();

                if (data.routes && data.routes.length > 0) {
                    // GeoJSON coordinates are [lng, lat], Leaflet needs [lat, lng]
                    const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
                    setRoutePath(coordinates);
                }
            } catch (err) {
                console.error("Error fetching route:", err);
                // Fallback to straight line
                setRoutePath([[busLocation.lat, busLocation.lng], [destination.lat, destination.lng]]);
            } finally {
                setIsLoadingRoute(false);
            }
        };

        // Debounce route fetching
        const timeoutId = setTimeout(fetchRoute, 500);
        return () => clearTimeout(timeoutId);

    }, [busLocation?.lat, busLocation?.lng, destination?.lat, destination?.lng, hasValidLocation]);

    // Internal component to handle recentering
    function RecenterMap({ lat, lng }) {
        const map = useMap();
        useEffect(() => {
            if (lat && lng) {
                map.flyTo([lat, lng], 13);
            }
        }, [lat, lng, map]);
        return null;
    }

    // Icons
    const createEmojiIcon = (emoji) => new L.DivIcon({
        html: `<div style="font-size: 30px; line-height: 1; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${emoji}</div>`,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });

    const createBusMarker = (count = 0) => {
        let color = '#10b981'; // Green (Low)
        if (count > 40) color = '#ef4444'; // Red (High)
        else if (count > 10) color = '#f59e0b'; // Orange (Medium)

        return new L.DivIcon({
            html: `
                <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                    <div style="font-size: 30px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">🚌</div>
                    <div style="position: absolute; top: -8px; right: -8px; background: ${color}; color: white; border-radius: 12px; padding: 2px 6px; font-size: 11px; font-weight: 800; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${count}
                    </div>
                </div>
            `,
            className: 'custom-bus-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    };

    const busIcon = createBusMarker(busLocation?.passengerCount || 0);
    const userIcon = createEmojiIcon('🔵');
    const destIcon = createEmojiIcon('🏁');
    const stopIcon = createEmojiIcon('🚏'); // Small Stop Icon

    return (
        <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%', borderRadius: '16px' }}
            preferCanvas={true}
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            keyboard={true}
            dragging={true}
            attributionControl={false}
            zoomAnimation={true}
            fadeAnimation={true}
            markerZoomAnimation={true}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
                minZoom={10}
                updateWhenIdle={false}
                updateWhenZooming={false}
                keepBuffer={2}
                loading="lazy"
            />

            {/* Bus Marker (Red) */}
            {hasValidLocation && (
                <>
                    <Marker position={position} icon={busIcon}>
                        <Popup>
                            Bus {busNumber} <br /> Speed: {Math.round(busLocation.speed || 0)} km/h
                        </Popup>
                    </Marker>
                    <MapRecenter lat={busLocation.lat} lng={busLocation.lng} />
                </>
            )}

            {/* User Marker (Blue) */}
            {userPos && (
                <Marker position={userPos} icon={userIcon}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* Intermediate Stops - Only show if valid coords */}
            {stops.filter(s => typeof s.lat === 'number' && typeof s.lng === 'number').map(stop => (
                <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon}>
                    <Popup>{stop.name}</Popup>
                </Marker>
            ))}

            {/* Destination (Green) */}
            {destPosition && hasValidLocation && (
                <>
                    <Marker position={destPosition} icon={destIcon}>
                        <Popup>Vels University (Campus)</Popup>
                    </Marker>
                    {/* Render Actual Path if valid, else fallback or nothing */}
                    {routePath && <Polyline positions={routePath} color="#10b981" weight={4} opacity={0.8} dashArray="10, 10" />}
                </>
            )}
        </MapContainer>
    );
}
