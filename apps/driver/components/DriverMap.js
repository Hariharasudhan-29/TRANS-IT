import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Default Icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const busIcon = new L.DivIcon({
    html: '<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🚌</div>',
    className: 'custom-bus-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const stopIcon = new L.DivIcon({
    html: '<div style="font-size: 20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));">🚏</div>',
    className: 'custom-stop-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
});

function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15);
        }
    }, [center, map]);
    return null;
}

export default function DriverMap({ location, routeStops = [] }) {
    // Filter stops that have valid coordinates
    const validStops = routeStops.filter(s => s.lat && s.lng);
    const polylinePositions = validStops.map(s => [s.lat, s.lng]);

    // Use current location or first stop or default
    const center = location ? [location.lat, location.lng] : (validStops[0] ? [validStops[0].lat, validStops[0].lng] : [9.9252, 78.1198]);

    return (
        <MapContainer center={center} zoom={13} style={{ height: '300px', width: '100%', borderRadius: '16px', zIndex: 0 }}>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
            {location && <RecenterMap center={[location.lat, location.lng]} />}

            {/* Bus Marker */}
            {location && (
                <Marker position={[location.lat, location.lng]} icon={busIcon}>
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* Route Path */}
            {polylinePositions.length > 1 && (
                <Polyline positions={polylinePositions} color="#3b82f6" weight={4} opacity={0.7} />
            )}

            {/* Stops */}
            {validStops.map((stop, idx) => (
                <Marker key={idx} position={[stop.lat, stop.lng]} icon={stopIcon}>
                    <Popup>{stop.name}<br />{stop.time}</Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
