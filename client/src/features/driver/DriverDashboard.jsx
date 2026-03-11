import { useState, useEffect } from 'react';
import { useAuth } from '../../core/context/AuthContext';
import { useSocket } from '../../core/context/SocketContext';
import api from '../../core/api/axiosClient';

export default function DriverDashboard() {
    const { user } = useAuth();
    const socket = useSocket();
    const [driver, setDriver] = useState(null);
    const [loading, setLoading] = useState(true);
    const [incomingRide, setIncomingRide] = useState(null);
    const [activeRide, setActiveRide] = useState(null);
    const [otpInput, setOtpInput] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [watchId, setWatchId] = useState(null);

    // Vehicle setup form
    const [vehicleForm, setVehicleForm] = useState({
        make: '', model: '', year: 2024, color: '', plateNumber: '', category: 'SEDAN',
    });
    const [vehicleLoading, setVehicleLoading] = useState(false);
    const [vehicleError, setVehicleError] = useState('');

    useEffect(() => { fetchProfile(); }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('ride:new_request', (data) => {
            setIncomingRide(data);
            setStatusMsg('New ride request!');
            setTimeout(() => setIncomingRide((prev) => (prev?.rideId === data.rideId ? null : prev)), 15000);
        });
        return () => { socket.off('ride:new_request'); };
    }, [socket]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/drivers/me');
            setDriver(data.data.driver);
            if (data.data.driver.currentRideId) {
                const rideRes = await api.get(`/rides/${data.data.driver.currentRideId}`);
                setActiveRide(rideRes.data.data.ride);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const toggleStatus = async () => {
        if (!driver) return;
        try {
            const newStatus = driver.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
            await api.patch('/drivers/me/status', { status: newStatus });
            setDriver({ ...driver, status: newStatus });
            setStatusMsg(newStatus === 'ONLINE' ? 'You are now online! Waiting for rides...' : 'You are now offline.');

            if (newStatus === 'ONLINE' && navigator.geolocation) {
                const id = navigator.geolocation.watchPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    api.patch('/drivers/me/location', { lat: latitude, lng: longitude }).catch(() => { });
                    socket?.emit('location:update', { lat: latitude, lng: longitude });
                }, null, { enableHighAccuracy: true, maximumAge: 3000 });
                setWatchId(id);
            } else if (newStatus === 'OFFLINE' && watchId) {
                navigator.geolocation.clearWatch(watchId);
                setWatchId(null);
            }
        } catch (err) {
            setStatusMsg(err.response?.data?.error?.message || 'Status update failed');
        }
    };

    const acceptRide = async () => {
        if (!incomingRide) return;
        try {
            const { data } = await api.patch(`/rides/${incomingRide.rideId}/accept`);
            setActiveRide(data.data.ride);
            setIncomingRide(null);
            setStatusMsg('Ride accepted! Navigate to pickup.');
            socket?.emit('ride:join', data.data.ride._id);
        } catch (err) {
            setStatusMsg(err.response?.data?.error?.message || 'Could not accept ride');
        }
    };

    const rejectRide = async () => {
        if (!incomingRide) return;
        try { await api.patch(`/rides/${incomingRide.rideId}/reject`); setIncomingRide(null); setStatusMsg('Ride rejected.'); }
        catch (err) { console.error(err); }
    };

    const arrivedAtPickup = async () => {
        if (!activeRide) return;
        try {
            const { data } = await api.patch(`/rides/${activeRide._id}/arrived`);
            setActiveRide(data.data.ride);
            setStatusMsg('Marked as arrived. Waiting for passenger.');
        } catch (err) { setStatusMsg(err.response?.data?.error?.message || 'Error'); }
    };

    const startTrip = async () => {
        if (!activeRide || !otpInput) return;
        try {
            const { data } = await api.patch(`/rides/${activeRide._id}/start`, { otp: otpInput });
            setActiveRide(data.data.ride);
            setStatusMsg('Trip started!');
            setOtpInput('');
        } catch (err) { setStatusMsg(err.response?.data?.error?.message || 'Invalid OTP'); }
    };

    const completeTrip = async () => {
        if (!activeRide) return;
        try {
            const { data } = await api.patch(`/rides/${activeRide._id}/complete`);
            setStatusMsg(`Trip completed! Earned ₹${data.data.fareBreakdown?.driverPayout || 0}`);
            setActiveRide(null);
            fetchProfile();
        } catch (err) { setStatusMsg(err.response?.data?.error?.message || 'Error'); }
    };

    const handleVehicleSubmit = async (e) => {
        e.preventDefault();
        setVehicleError('');
        setVehicleLoading(true);
        try {
            await api.post('/drivers/me/vehicle', vehicleForm);
            setStatusMsg('Vehicle registered! You are now approved.');
            fetchProfile();
        } catch (err) {
            setVehicleError(err.response?.data?.error?.message || 'Failed to register vehicle');
        } finally {
            setVehicleLoading(false);
        }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading dashboard...</p></div>;

    // Vehicle setup form for new drivers
    const needsVehicle = driver && (!driver.vehicleId || driver.approvalStatus !== 'APPROVED');
    if (needsVehicle) {
        return (
            <div className="page animate-fadeIn">
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <div className="text-center mb-3">
                        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚗</div>
                        <h1>Complete Your Driver Profile</h1>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Register your vehicle to start accepting rides</p>
                    </div>

                    <div className="card">
                        <h2 style={{ marginBottom: '20px' }}>🚙 Vehicle Registration</h2>

                        {vehicleError && <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '16px', justifyContent: 'center' }}>{vehicleError}</div>}

                        <form onSubmit={handleVehicleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Make</label>
                                    <input className="input" placeholder="e.g. Maruti Suzuki" value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Model</label>
                                    <input className="input" placeholder="e.g. Dzire" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <div className="form-group">
                                    <label>Year</label>
                                    <input className="input" type="number" min="2010" max="2026" value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value) })} required />
                                </div>
                                <div className="form-group">
                                    <label>Color</label>
                                    <input className="input" placeholder="e.g. White" value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select className="input" value={vehicleForm.category} onChange={(e) => setVehicleForm({ ...vehicleForm, category: e.target.value })}>
                                        <option value="MINI">Mini</option>
                                        <option value="SEDAN">Sedan</option>
                                        <option value="SUV">SUV</option>
                                        <option value="PREMIUM">Premium</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>License Plate Number</label>
                                <input className="input" placeholder="e.g. DL-01-AB-1234" value={vehicleForm.plateNumber} onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value.toUpperCase() })} required style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={vehicleLoading}>
                                {vehicleLoading ? <><div className="spinner" style={{ width: '18px', height: '18px' }} /> Registering...</> : '✅ Register Vehicle & Go Online'}
                            </button>
                        </form>

                        <div className="glass-card mt-3" style={{ padding: '12px' }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                ℹ️ Your driver account will be auto-approved once you register your vehicle. You can then start accepting ride requests immediately.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
                <h1>🚗 Driver Dashboard</h1>
                <button onClick={toggleStatus} className={`btn ${driver?.status === 'ONLINE' ? 'btn-success' : 'btn-secondary'} btn-lg`}>
                    {driver?.status === 'ONLINE' ? '🟢 Online' : '⚫ Go Online'}
                </button>
            </div>

            {statusMsg && (
                <div className="ride-status mb-2 animate-slideUp">
                    <div className="pulse-dot" />
                    <span>{statusMsg}</span>
                </div>
            )}

            {/* Stats */}
            <div className="grid-4 mb-3">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>⭐</div>
                    <div className="stat-value">{driver?.avgRating?.toFixed(1)}</div>
                    <div className="stat-label">Rating</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>🛣️</div>
                    <div className="stat-value">{driver?.totalTrips}</div>
                    <div className="stat-label">Total Trips</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>💰</div>
                    <div className="stat-value">₹{driver?.totalEarnings?.toLocaleString()}</div>
                    <div className="stat-label">Total Earnings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>✅</div>
                    <div className="stat-value">{(driver?.acceptanceRate * 100)?.toFixed(0)}%</div>
                    <div className="stat-label">Accept Rate</div>
                </div>
            </div>

            {/* Incoming ride request */}
            {incomingRide && (
                <div className="card animate-slideUp" style={{ border: '2px solid var(--accent)', animation: 'glow 1.5s infinite' }}>
                    <h2 style={{ marginBottom: '12px' }}>🔔 New Ride Request!</h2>
                    <div className="flex flex-col gap-1" style={{ marginBottom: '16px' }}>
                        <p>📍 Pickup: {incomingRide.pickup?.address}</p>
                        <p>🏁 Drop: {incomingRide.drop?.address}</p>
                        <p>💰 Fare: ₹{incomingRide.estimatedFare} • {incomingRide.vehicleType}</p>
                        <p>📏 Distance to pickup: {incomingRide.distanceToPickup} km</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={acceptRide} className="btn btn-success btn-lg" style={{ flex: 1 }}>✓ Accept</button>
                        <button onClick={rejectRide} className="btn btn-danger btn-lg" style={{ flex: 1 }}>✗ Reject</button>
                    </div>
                </div>
            )}

            {/* Active ride controls */}
            {activeRide && (
                <div className="card animate-slideUp">
                    <h2 style={{ marginBottom: '16px' }}>🛣️ Active Ride</h2>
                    <div className="glass-card mb-2" style={{ padding: '16px' }}>
                        <p>📍 {activeRide.pickup?.address} → 🏁 {activeRide.drop?.address}</p>
                        <p style={{ marginTop: '8px' }}>Status: <span className="badge badge-info">{activeRide.status}</span></p>
                        <p>Fare: <strong>₹{activeRide.estimatedFare}</strong></p>
                    </div>

                    {activeRide.status === 'ACCEPTED' && (
                        <button onClick={arrivedAtPickup} className="btn btn-primary btn-full btn-lg">📍 I've Arrived at Pickup</button>
                    )}

                    {activeRide.status === 'ARRIVED' && (
                        <div className="flex gap-1">
                            <input className="input" placeholder="Enter OTP" value={otpInput} onChange={(e) => setOtpInput(e.target.value)} style={{ flex: 1 }} />
                            <button onClick={startTrip} className="btn btn-primary btn-lg">Start Trip</button>
                        </div>
                    )}

                    {activeRide.status === 'IN_PROGRESS' && (
                        <button onClick={completeTrip} className="btn btn-success btn-full btn-lg">🏁 Complete Trip</button>
                    )}
                </div>
            )}

            {/* Vehicle info */}
            {driver?.vehicleId && (
                <div className="card mt-2">
                    <h3 style={{ marginBottom: '12px' }}>🚙 Your Vehicle</h3>
                    <div className="flex items-center gap-2">
                        <div style={{ fontSize: '2rem' }}>🚗</div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{driver.vehicleId.make} {driver.vehicleId.model} ({driver.vehicleId.year})</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{driver.vehicleId.plateNumber} • {driver.vehicleId.color} • {driver.vehicleId.category}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
