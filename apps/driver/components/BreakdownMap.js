import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon (Blue) for other buses
const busIcon = new L.DivIcon({
    html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🚌</div>',
    className: 'custom-bus-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Custom My Bus Icon (Red) - using a different emoji or color or style
const myBusIcon = new L.DivIcon({
    html: '<div style="font-size: 28px; filter: drop-shadow(0 2px 2px rgba(239, 68, 68, 0.5));">🆘</div>',
    className: 'custom-my-bus-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 17] // centered
});

function RecenterMap({ buses, myLocation }) {
    const map = useMap();

    React.useEffect(() => {
        const locations = [];
        if (myLocation) locations.push([myLocation.lat, myLocation.lng]);

        buses.forEach(b => {
            const lat = b.lat || b.location?.lat;
            const lng = b.lng || b.location?.lng;
            if (lat && lng) locations.push([lat, lng]);
        });

        if (locations.length > 0) {
            const bounds = L.latLngBounds(locations);
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [buses, myLocation, map]);

    return null;
}

export default function BreakdownMap({ buses = [], myLocation, onContact }) {
    // Default Center (Chennai) - Fallback
    const center = myLocation ? [myLocation.lat, myLocation.lng] : [12.957952, 80.160793];

    // Calculate distance helper
    const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d.toFixed(1);
    }

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180)
    }

    return (
        <MapContainer center={center} zoom={13} style={{ height: '400px', width: '100%', borderRadius: '16px', zIndex: 0 }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            <RecenterMap buses={buses} myLocation={myLocation} />

            {/* My Location (Breakdown Spot) */}
            {myLocation && (
                <>
                    <Marker position={[myLocation.lat, myLocation.lng]} icon={myBusIcon}>
                        <Popup>
                            <strong>Your Breakdown Location</strong>
                        </Popup>
                    </Marker>
                    <Circle center={[myLocation.lat, myLocation.lng]} radius={100} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }} />
                </>
            )}

            {/* Other Buses */}
            {buses.map(bus => {
                const lat = bus.lat || bus.location?.lat;
                const lng = bus.lng || bus.location?.lng;

                if (!lat || !lng) return null;

                // Calculate distance if myLocation is available
                const dist = myLocation ? getDistance(myLocation.lat, myLocation.lng, lat, lng) : '?';

                return (
                    <Marker key={bus.id} position={[lat, lng]} icon={busIcon}>
                        <Popup>
                            <div style={{ textAlign: 'center', minWidth: '150px' }}>
                                <strong style={{ fontSize: '16px', color: '#1e3a8a', display: 'block', marginBottom: '4px' }}>Bus {bus.id}</strong>
                                <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                    Driver: <strong>{bus.driverName || 'Unknown'}</strong>
                                </div>
                                <div style={{ fontSize: '14px', marginBottom: '8px', color: '#059669', fontWeight: 'bold' }}>
                                    {dist} km away
                                </div>
                                {bus.phone && (
                                    <a href={`tel:${bus.phone}`} style={{
                                        display: 'block', padding: '8px 12px', background: '#3b82f6', color: 'white',
                                        textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px'
                                    }}>
                                        📞 Call Driver
                                    </a>
                                )}
                                {!bus.phone && (
                                    <button onClick={() => onContact(bus)} style={{
                                        width: '100%', padding: '8px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                    }}>
                                        Request Help
                                    </button>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
