import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline, useMap } from 'react-leaflet';
import { useAuth } from '../../core/context/AuthContext';
import { useSocket } from '../../core/context/SocketContext';
import api from '../../core/api/axiosClient';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pickupIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const dropIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const driverIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });

function LocationPicker({ onPickup, onDrop, mode }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            if (mode === 'pickup') onPickup({ lat, lng });
            else if (mode === 'drop') onDrop({ lat, lng });
        },
    });
    return null;
}

function FitBounds({ pickup, drop }) {
    const map = useMap();
    useEffect(() => {
        if (pickup && drop) {
            const bounds = L.latLngBounds([pickup.lat, pickup.lng], [drop.lat, drop.lng]);
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (pickup) {
            map.setView([pickup.lat, pickup.lng], 14);
        }
    }, [pickup, drop, map]);
    return null;
}

// Reverse geocode
async function reverseGeocode(lat, lng) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
        const data = await res.json();
        if (data?.display_name) {
            const a = data.address || {};
            const parts = [a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
        }
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

// Search places
async function searchPlaces(query) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=1`);
        return await res.json();
    } catch { return []; }
}

export default function BookRide() {
    const { user } = useAuth();
    const socket = useSocket();
    const [pickup, setPickup] = useState(null);
    const [drop, setDrop] = useState(null);
    const [pickupAddress, setPickupAddress] = useState('');
    const [dropAddress, setDropAddress] = useState('');
    const [pickupQuery, setPickupQuery] = useState('');
    const [dropQuery, setDropQuery] = useState('');
    const [pickupResults, setPickupResults] = useState([]);
    const [dropResults, setDropResults] = useState([]);
    const [showPickupSearch, setShowPickupSearch] = useState(false);
    const [showDropSearch, setShowDropSearch] = useState(false);
    const [mode, setMode] = useState('pickup');
    const [estimates, setEstimates] = useState(null);
    const [selectedType, setSelectedType] = useState('SEDAN');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [loading, setLoading] = useState(false);
    const [activeRide, setActiveRide] = useState(null);
    const [driverInfo, setDriverInfo] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [rideStatus, setRideStatus] = useState('');
    const [rideOtp, setRideOtp] = useState('');
    const [routeCoords, setRouteCoords] = useState([]);
    const [pendingPayment, setPendingPayment] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [completedRideId, setCompletedRideId] = useState(null);
    const pickupSearchTimer = useRef(null);
    const dropSearchTimer = useRef(null);

    // Socket listeners
    useEffect(() => {
        if (!socket) return;
        socket.on('ride:accepted', (data) => {
            setDriverInfo(data.driver);
            setRideStatus('Driver is on the way!');
            if (data.driver.location?.coordinates) {
                setDriverLocation({ lat: data.driver.location.coordinates[1], lng: data.driver.location.coordinates[0] });
            }
        });
        socket.on('ride:driver_arrived', (data) => {
            setRideStatus('Driver has arrived at pickup!');
            if (data.otp) setRideOtp(data.otp);
        });
        socket.on('ride:started', () => setRideStatus('Trip is in progress...'));
        socket.on('ride:completed', (data) => {
            const method = data.paymentMethod || 'CASH';
            setCompletedRideId(data.rideId);
            if (method !== 'CASH') {
                setRideStatus('Trip completed! Processing payment...');
                setPendingPayment(data);
            } else {
                setRideStatus(`Trip completed! Paid ₹${data.fare.total} in Cash.`);
                setTimeout(() => { setActiveRide(null); setRideStatus(''); setDriverLocation(null); setShowRating(true); }, 2000);
            }
        });
        socket.on('ride:no_drivers', () => { setRideStatus('No drivers available nearby. Try again.'); setTimeout(() => { setActiveRide(null); setRideStatus(''); }, 4000); });
        socket.on('ride:cancelled', (data) => { setRideStatus(`Ride cancelled by ${data.by}`); setTimeout(() => resetAll(), 3000); });
        socket.on('driver:location', (data) => setDriverLocation({ lat: data.lat, lng: data.lng }));
        socket.on('ride:searching', () => setRideStatus('Searching for nearby drivers...'));
        return () => {
            ['ride:accepted', 'ride:driver_arrived', 'ride:started', 'ride:completed', 'ride:no_drivers', 'ride:cancelled', 'driver:location', 'ride:searching']
                .forEach(e => socket.off(e));
        };
    }, [socket]);

    const resetAll = () => {
        setActiveRide(null); setRideStatus(''); setDriverInfo(null);
        setDriverLocation(null); setPickup(null); setDrop(null);
        setEstimates(null); setRideOtp(''); setMode('pickup');
        setRouteCoords([]); setPendingPayment(null); setPaymentSuccess(false);
        setPickupAddress(''); setDropAddress(''); setCompletedRideId(null);
        setPickupQuery(''); setDropQuery('');
    };

    // Search handlers with debounce
    const handlePickupSearch = (q) => {
        setPickupQuery(q);
        setShowPickupSearch(true);
        clearTimeout(pickupSearchTimer.current);
        if (q.length >= 3) {
            pickupSearchTimer.current = setTimeout(async () => {
                setPickupResults(await searchPlaces(q));
            }, 400);
        } else {
            setPickupResults([]);
        }
    };

    const handleDropSearch = (q) => {
        setDropQuery(q);
        setShowDropSearch(true);
        clearTimeout(dropSearchTimer.current);
        if (q.length >= 3) {
            dropSearchTimer.current = setTimeout(async () => {
                setDropResults(await searchPlaces(q));
            }, 400);
        } else {
            setDropResults([]);
        }
    };

    const selectPickupResult = (result) => {
        const loc = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        setPickup(loc);
        const a = result.address || {};
        const addr = [a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village].filter(Boolean).join(', ') || result.display_name.split(',').slice(0, 3).join(',');
        setPickupAddress(addr);
        setPickupQuery(addr);
        setPickupResults([]);
        setShowPickupSearch(false);
        setEstimates(null); setRouteCoords([]);
        if (!drop) setMode('drop');
    };

    const selectDropResult = (result) => {
        const loc = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        setDrop(loc);
        const a = result.address || {};
        const addr = [a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village].filter(Boolean).join(', ') || result.display_name.split(',').slice(0, 3).join(',');
        setDropAddress(addr);
        setDropQuery(addr);
        setDropResults([]);
        setShowDropSearch(false);
        setEstimates(null); setRouteCoords([]);
    };

    const handleSetPickup = useCallback(async (loc) => {
        setPickup(loc); setEstimates(null); setRouteCoords([]);
        if (!drop) setMode('drop');
        const addr = await reverseGeocode(loc.lat, loc.lng);
        setPickupAddress(addr); setPickupQuery(addr);
    }, [drop]);

    const handleSetDrop = useCallback(async (loc) => {
        setDrop(loc); setEstimates(null); setRouteCoords([]);
        const addr = await reverseGeocode(loc.lat, loc.lng);
        setDropAddress(addr); setDropQuery(addr);
    }, []);

    const getRouteAndEstimate = async () => {
        if (!pickup || !drop) return;
        setLoading(true);
        try {
            const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`);
            const routeData = await osrmRes.json();
            if (routeData.routes?.length > 0) {
                setRouteCoords(routeData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]));
            } else {
                setRouteCoords([[pickup.lat, pickup.lng], [drop.lat, drop.lng]]);
            }
            const { data } = await api.post('/rides/estimate', { pickup, drop });
            setEstimates(data.data.estimates);
        } catch (err) {
            console.error(err);
            setRouteCoords([[pickup.lat, pickup.lng], [drop.lat, drop.lng]]);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (pickup && drop && !estimates && !activeRide) getRouteAndEstimate();
    }, [pickup, drop]);

    const requestRide = async () => {
        if (!pickup || !drop) return;
        setLoading(true);
        try {
            const { data } = await api.post('/rides/request', {
                pickup: { ...pickup, address: pickupAddress || 'Pickup Location' },
                drop: { ...drop, address: dropAddress || 'Drop Location' },
                vehicleType: selectedType, paymentMethod,
            });
            setActiveRide(data.data.ride);
            if (data.data.otp) setRideOtp(data.data.otp);
            setRideStatus('Searching for nearby drivers...');
        } catch (err) {
            setRideStatus(err.response?.data?.error?.message || 'Booking failed');
            setTimeout(() => setRideStatus(''), 3000);
        } finally { setLoading(false); }
    };

    const cancelRide = async () => {
        if (!activeRide) return;
        try { await api.patch(`/rides/${activeRide._id}/cancel`, { reason: 'Changed plans' }); resetAll(); }
        catch (err) { console.error(err); }
    };

    const submitRating = async () => {
        if (!completedRideId) return;
        setRatingSubmitting(true);
        try { await api.post('/ratings', { rideId: completedRideId, stars: ratingStars, comment: ratingComment }); }
        catch (err) { console.error(err); }
        finally { setRatingSubmitting(false); setShowRating(false); resetAll(); }
    };

    const vehicleEmojis = { MINI: '🚗', SEDAN: '🚙', SUV: '🚐', PREMIUM: '🏎️' };
    const center = [28.6139, 77.2090];
    const currentStep = !pickup ? 1 : !drop ? 2 : !estimates ? 3 : !activeRide ? 4 : 5;

    const simulatePayment = () => {
        setPaymentProcessing(true);
        setTimeout(() => {
            setPaymentProcessing(false); setPaymentSuccess(true);
            setTimeout(() => {
                setPendingPayment(null); setPaymentSuccess(false);
                setActiveRide(null); setRideStatus(''); setDriverLocation(null);
                setShowRating(true);
            }, 2000);
        }, 2000);
    };

    const searchDropdownStyle = {
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
        maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
    };

    const searchItemStyle = {
        padding: '10px 12px', cursor: 'pointer', fontSize: '0.82rem',
        borderBottom: '1px solid var(--border)', color: 'var(--text-primary)',
        transition: 'background 0.15s',
    };

    return (
        <div className="page animate-fadeIn">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', minHeight: 'calc(100vh - 120px)' }}>
                {/* Map */}
                <div style={{ position: 'relative' }}>
                    <div style={{
                        position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 1000,
                        background: 'rgba(10, 14, 23, 0.9)', borderRadius: 'var(--radius-md)',
                        padding: '12px 16px', border: '1px solid var(--accent)',
                        display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(8px)',
                    }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: mode === 'pickup' ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>
                            {mode === 'pickup' ? '📍' : '🏁'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                {!activeRide
                                    ? mode === 'pickup' ? '👆 Click map or type to set PICKUP' : '👆 Click map or type to set DROP'
                                    : rideStatus || 'Ride in progress...'}
                            </div>
                            {!activeRide && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {pickup ? '✅ Pickup set' : 'Step 1 of 2'} {drop ? '• ✅ Drop set' : pickup ? '• Step 2 of 2' : ''}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="map-container" style={{ height: '100%', minHeight: '500px' }}>
                        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                            <LocationPicker onPickup={handleSetPickup} onDrop={handleSetDrop} mode={mode} />
                            <FitBounds pickup={pickup} drop={drop} />
                            {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}><Popup>📍 {pickupAddress || 'Pickup'}</Popup></Marker>}
                            {drop && <Marker position={[drop.lat, drop.lng]} icon={dropIcon}><Popup>🏁 {dropAddress || 'Drop'}</Popup></Marker>}
                            {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}><Popup>🚕 Driver</Popup></Marker>}
                            {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#6366f1" weight={4} opacity={0.8} />}
                        </MapContainer>
                    </div>
                </div>

                {/* Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="card">
                        <h2 style={{ marginBottom: '16px' }}>🚕 Book a Ride</h2>

                        {rideStatus && (
                            <div className="ride-status" style={{ marginBottom: '16px' }}>
                                <div className="pulse-dot" />
                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{rideStatus}</span>
                            </div>
                        )}

                        {!activeRide && (
                            <>
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                                    {[1, 2, 3, 4].map(s => (
                                        <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= currentStep ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s ease' }} />
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                    <button className={`btn ${mode === 'pickup' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ flex: 1, position: 'relative' }} onClick={() => setMode('pickup')}>
                                        📍 Set Pickup
                                        {pickup && <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>✓</span>}
                                    </button>
                                    <button className={`btn ${mode === 'drop' ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ flex: 1, position: 'relative' }} onClick={() => setMode('drop')}>
                                        🏁 Set Drop
                                        {drop && <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>✓</span>}
                                    </button>
                                </div>

                                {/* PICKUP search input */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', borderRadius: 'var(--radius-sm)',
                                            background: mode === 'pickup' ? 'var(--accent-glow)' : 'var(--bg-glass)',
                                            border: `1px solid ${mode === 'pickup' ? 'var(--accent)' : pickup ? 'var(--success)' : 'var(--border)'}`,
                                            transition: 'var(--transition)', overflow: 'hidden',
                                        }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: pickup ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }} />
                                            <input
                                                type="text"
                                                placeholder="📍 Search pickup location..."
                                                value={pickupQuery}
                                                onChange={(e) => handlePickupSearch(e.target.value)}
                                                onFocus={() => { setMode('pickup'); setShowPickupSearch(true); }}
                                                onBlur={() => setTimeout(() => setShowPickupSearch(false), 200)}
                                                style={{
                                                    flex: 1, padding: '12px 8px', background: 'transparent', border: 'none',
                                                    color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem',
                                                }}
                                            />
                                            {pickup && <button onClick={() => { setPickup(null); setPickupAddress(''); setPickupQuery(''); setEstimates(null); setRouteCoords([]); setMode('pickup'); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 12px 0 4px' }}>✕</button>}
                                        </div>
                                        {showPickupSearch && pickupResults.length > 0 && (
                                            <div style={searchDropdownStyle}>
                                                {pickupResults.map((r, i) => (
                                                    <div key={i} style={searchItemStyle}
                                                        onMouseDown={() => selectPickupResult(r)}
                                                        onMouseEnter={(e) => e.target.style.background = 'var(--accent-glow)'}
                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                                                        📍 {r.display_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '16px' }}>
                                        <div style={{ width: '2px', height: '12px', background: 'var(--border)', borderRadius: '1px' }} />
                                    </div>

                                    {/* DROP search input */}
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px', borderRadius: 'var(--radius-sm)',
                                            background: mode === 'drop' ? 'var(--accent-glow)' : 'var(--bg-glass)',
                                            border: `1px solid ${mode === 'drop' ? 'var(--accent)' : drop ? 'var(--danger)' : 'var(--border)'}`,
                                            transition: 'var(--transition)', overflow: 'hidden',
                                        }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: drop ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0, marginLeft: '12px' }} />
                                            <input
                                                type="text"
                                                placeholder="🏁 Search drop location..."
                                                value={dropQuery}
                                                onChange={(e) => handleDropSearch(e.target.value)}
                                                onFocus={() => { setMode('drop'); setShowDropSearch(true); }}
                                                onBlur={() => setTimeout(() => setShowDropSearch(false), 200)}
                                                style={{
                                                    flex: 1, padding: '12px 8px', background: 'transparent', border: 'none',
                                                    color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem',
                                                }}
                                            />
                                            {drop && <button onClick={() => { setDrop(null); setDropAddress(''); setDropQuery(''); setEstimates(null); setRouteCoords([]); setMode('drop'); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 12px 0 4px' }}>✕</button>}
                                        </div>
                                        {showDropSearch && dropResults.length > 0 && (
                                            <div style={searchDropdownStyle}>
                                                {dropResults.map((r, i) => (
                                                    <div key={i} style={searchItemStyle}
                                                        onMouseDown={() => selectDropResult(r)}
                                                        onMouseEnter={(e) => e.target.style.background = 'var(--accent-glow)'}
                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                                                        🏁 {r.display_name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {loading && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px' }}>
                                        <div className="spinner" style={{ width: '20px', height: '20px' }} />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Calculating route & fares...</span>
                                    </div>
                                )}
                            </>
                        )}

                        {activeRide && rideOtp && (
                            <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Your OTP</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em', color: 'var(--accent-hover)' }}>{rideOtp}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Share with driver to start trip</div>
                            </div>
                        )}
                    </div>

                    {/* Fare estimates */}
                    {estimates && !activeRide && (
                        <div className="card animate-slideUp">
                            <h3 style={{ marginBottom: '12px' }}>Choose Vehicle</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(estimates).map(([type, est]) => (
                                    <div key={type} className={`fare-card ${selectedType === type ? 'selected' : ''}`} onClick={() => setSelectedType(type)}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="fare-type">{vehicleEmojis[type]} {type}</div>
                                                <div className="fare-details">{est.distanceKm} km • {est.durationMin} min</div>
                                            </div>
                                            <div className="fare-price">₹{est.total}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="form-group mt-2">
                                <label>Payment Method</label>
                                <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                    <option value="CASH">💵 Cash</option>
                                    <option value="WALLET">👛 Wallet (₹{user?.wallet?.balance || 0})</option>
                                    <option value="CARD">💳 Card</option>
                                </select>
                            </div>
                            <button onClick={requestRide} className="btn btn-primary btn-full btn-lg mt-2" disabled={loading}>
                                {loading ? 'Booking...' : `🚕 Book ${selectedType} — ₹${estimates[selectedType]?.total}`}
                            </button>
                        </div>
                    )}

                    {/* Driver info */}
                    {driverInfo && (
                        <div className="card animate-slideUp">
                            <h3 style={{ marginBottom: '12px' }}>Your Driver</h3>
                            <div className="flex items-center gap-2">
                                <div className="user-avatar" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>{driverInfo.name?.[0]}</div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{driverInfo.name}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⭐ {driverInfo.rating?.toFixed(1)} • 📞 {driverInfo.phone}</div>
                                </div>
                            </div>
                            {driverInfo.vehicle && (
                                <div className="glass-card mt-2" style={{ padding: '12px' }}>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <strong>{driverInfo.vehicle.make} {driverInfo.vehicle.model}</strong> • {driverInfo.vehicle.color}
                                        <br /><span style={{ color: 'var(--text-muted)' }}>{driverInfo.vehicle.plateNumber} • {driverInfo.vehicle.category}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeRide && !pendingPayment && (
                        <button onClick={cancelRide} className="btn btn-danger btn-full">✕ Cancel Ride</button>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {pendingPayment && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '32px', overflow: 'hidden' }}>
                        {paymentSuccess ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px' }}>✓</div>
                                <h2>Payment Successful!</h2>
                                <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>₹{pendingPayment.fare?.total || 0} paid securely.</p>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ margin: 0 }}>Secure Checkout</h2>
                                    <span style={{ fontSize: '1.5rem' }}>🔒</span>
                                </div>
                                <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount to Pay</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '4px' }}>₹{pendingPayment.fare?.total || 0}</div>
                                </div>
                                <div className="form-group">
                                    <label>Card Details</label>
                                    <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px', alignItems: 'center', gap: '8px' }}>
                                        <span>💳</span>
                                        <input type="text" value="•••• •••• •••• 4242" readOnly style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontFamily: 'monospace', fontSize: '1rem' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                        <input type="text" value="12/28" readOnly className="input" style={{ textAlign: 'center' }} />
                                        <input type="password" value="123" readOnly className="input" style={{ textAlign: 'center' }} />
                                    </div>
                                </div>
                                <button onClick={simulatePayment} className="btn btn-primary btn-full btn-lg" style={{ marginTop: '24px' }} disabled={paymentProcessing}>
                                    {paymentProcessing ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: 'white' }} /> Processing...</span> : `Pay ₹${pendingPayment.fare?.total || 0}`}
                                </button>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>Simulated Payment • No real charge</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Rating Modal */}
            {showRating && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,8,15,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%', padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>⭐</div>
                        <h2>Rate Your Ride</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>How was your trip?</p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRatingStars(s)} style={{
                                    background: 'none', border: 'none', fontSize: '2.5rem', cursor: 'pointer',
                                    color: s <= ratingStars ? '#fbbf24' : 'var(--text-muted)',
                                    transform: s <= ratingStars ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s',
                                }}>★</button>
                            ))}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            {ratingStars === 5 ? 'Excellent!' : ratingStars === 4 ? 'Great!' : ratingStars === 3 ? 'Good' : ratingStars === 2 ? 'Fair' : 'Poor'}
                        </div>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label>Comment (optional)</label>
                            <textarea className="input" rows={3} placeholder="Tell us about your experience..." value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} style={{ resize: 'vertical', minHeight: '80px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                            <button onClick={() => { setShowRating(false); resetAll(); }} className="btn btn-secondary" style={{ flex: 1 }}>Skip</button>
                            <button onClick={submitRating} className="btn btn-primary" style={{ flex: 2 }} disabled={ratingSubmitting}>
                                {ratingSubmitting ? 'Submitting...' : `Submit ${ratingStars}★ Rating`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
