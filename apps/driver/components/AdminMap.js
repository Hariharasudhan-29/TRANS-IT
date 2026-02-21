import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Bus Icon
const busIcon = new L.DivIcon({
    html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🚌</div>',
    className: 'custom-bus-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

function RecenterMap({ buses }) {
    const map = useMap();

    React.useEffect(() => {
        if (buses.length > 0) {
            const validBuses = buses.filter(b => (b.lat || b.location?.lat) && (b.lng || b.location?.lng));
            if (validBuses.length > 0) {
                const bounds = L.latLngBounds(validBuses.map(b => [b.lat || b.location?.lat, b.lng || b.location?.lng]));
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
            }
        }
    }, [buses, map]);

    return null;
}

export default function AdminMap({ buses = [] }) {
    // Default Center (Chennai)
    const center = [12.957952, 80.160793];

    return (
        <MapContainer center={center} zoom={11} style={{ height: '600px', width: '100%', borderRadius: '16px', zIndex: 0 }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <RecenterMap buses={buses} />
            {buses.map(bus => {
                const lat = bus.lat || bus.location?.lat;
                const lng = bus.lng || bus.location?.lng;

                if (!lat || !lng) return null;

                return (
                    <Marker key={bus.id} position={[lat, lng]} icon={busIcon}>
                        <Popup>
                            <div style={{ textAlign: 'center' }}>
                                <strong style={{ fontSize: '14px', color: '#1e3a8a' }}>{bus.id}</strong>
                                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                    Speed: {bus.speed ? Math.round(bus.speed) : 0} km/h
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                    {bus.lastUpdated?.seconds ? new Date(bus.lastUpdated.seconds * 1000).toLocaleTimeString() : 'Just now'}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
