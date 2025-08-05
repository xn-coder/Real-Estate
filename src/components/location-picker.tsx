
'use client'

import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { LatLngExpression, LatLng, Icon } from 'leaflet'

// Leaflet's default icon doesn't work well with bundlers, so we fix it
import 'leaflet/dist/leaflet.css';
const markerIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});


interface LocationPickerProps {
    onLocationChange: (lat: number, lng: number) => void;
    position?: LatLngExpression;
}

const LocationMarker = ({ onLocationChange, initialPosition }: { onLocationChange: (lat: number, lng: number) => void, initialPosition: LatLng }) => {
    const [position, setPosition] = useState<LatLng>(initialPosition);

    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onLocationChange(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    useEffect(() => {
        // This effect runs when the initialPosition prop changes,
        // which can happen if the parent form's value is updated elsewhere.
        if (initialPosition && (initialPosition.lat !== position.lat || initialPosition.lng !== position.lng)) {
            setPosition(initialPosition);
        }
    }, [initialPosition, position.lat, position.lng]);

    return position === null ? null : (
        <Marker position={position} icon={markerIcon}></Marker>
    )
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationChange, position: initialPositionArray }) => {
    
    const initialPosition = React.useMemo(() => {
        if (Array.isArray(initialPositionArray) && initialPositionArray.length === 2) {
            return new LatLng(initialPositionArray[0], initialPositionArray[1]);
        }
        return new LatLng(20.5937, 78.9629); // Default to center of India
    }, [initialPositionArray]);


    return (
        <MapContainer center={initialPosition} zoom={5} style={{ height: '400px', width: '100%' }} className='rounded-md'>
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker onLocationChange={onLocationChange} initialPosition={initialPosition} />
        </MapContainer>
    );
};

export default LocationPicker;
