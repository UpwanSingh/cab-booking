import { useState, useEffect } from 'react';
import api from '../../core/api/axiosClient';
import { useSocket } from '../../core/context/SocketContext';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sosAlert, setSosAlert] = useState(null);
    const [pendingDrivers, setPendingDrivers] = useState([]);
    const socket = useSocket();

    useEffect(() => {
        fetchStats();
        fetchPendingDrivers();
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('admin:sos_alert', (data) => {
            setSosAlert(data);
            // Optionally play an audio alarm here
        });
        return () => socket.off('admin:sos_alert');
    }, [socket]);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/analytics');
            setStats(data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchPendingDrivers = async () => {
        try {
            const { data } = await api.get('/admin/drivers?status=PENDING_VERIFICATION');
            setPendingDrivers(data.data.drivers || []);
        } catch (err) { console.error('Failed to load pending drivers', err); }
    };

    const handleKycAction = async (driverId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this driver?`)) return;
        try {
            await api.patch(`/admin/drivers/${driverId}/${action}`);
            setPendingDrivers(prev => prev.filter(d => d._id !== driverId));
        } catch (err) { alert('Failed to process KYC action'); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading analytics...</p></div>;

    return (
        <div className="page animate-fadeIn">
            {sosAlert && (
                <div style={{ background: '#dc2626', color: 'white', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '24px', animation: 'glow 1s infinite alternate', border: '2px solid #ef4444' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>🚨 CRITICAL EMERGENCY SOS ACTIVATED</h2>
                    <p style={{ marginTop: '8px', fontWeight: 600 }}>Ride ID: {sosAlert.rideId}</p>
                    <p style={{ fontSize: '0.9rem' }}>Location: {sosAlert.location?.address || 'Unknown'}</p>
                    <button onClick={() => setSosAlert(null)} className="btn btn-secondary mt-2" style={{ background: 'white', color: '#dc2626' }}>Acknowledge Alert</button>
                </div>
            )}

            <h1 style={{ marginBottom: '24px' }}>📊 Admin Dashboard</h1>

            <div className="grid-4 mb-3">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>🛣️</div>
                    <div className="stat-value">{stats?.totalRides}</div>
                    <div className="stat-label">Total Rides</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>✅</div>
                    <div className="stat-value">{stats?.completedRides}</div>
                    <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>🔄</div>
                    <div className="stat-value">{stats?.activeRides}</div>
                    <div className="stat-label">Active Now</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>❌</div>
                    <div className="stat-value">{stats?.cancelledRides}</div>
                    <div className="stat-label">Cancelled</div>
                </div>
            </div>

            <div className="grid-3 mb-3">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>💰</div>
                    <div className="stat-value">₹{stats?.totalRevenue?.toLocaleString()}</div>
                    <div className="stat-label">Total Revenue</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>👤</div>
                    <div className="stat-value">{stats?.totalUsers}</div>
                    <div className="stat-label">Passengers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>🚗</div>
                    <div className="stat-value">{stats?.totalDrivers}</div>
                    <div className="stat-label">Drivers</div>
                </div>
            </div>

            {/* KYC Pending Table */}
            {pendingDrivers.length > 0 && (
                <div className="card mb-3 animate-slideUp" style={{ border: '1px solid var(--warning)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <span style={{ fontSize: '1.5rem' }}>⏳</span> Pending Driver KYC Approvals
                        </h2>
                        <div className="badge badge-warning">{pendingDrivers.length} waiting</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {pendingDrivers.map(dr => (
                            <div key={dr._id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0' }}>{dr.userId?.name} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>• {dr.userId?.phone}</span></h3>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        Vehicle: {dr.vehicleId?.make} {dr.vehicleId?.model} ({dr.vehicleId?.year}) • Color: {dr.vehicleId?.color}
                                    </div>
                                    <div style={{ marginTop: '4px' }}>
                                        <span className="badge badge-neutral" style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{dr.vehicleId?.plateNumber}</span>
                                        <span className="badge" style={{ marginLeft: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}>{dr.vehicleId?.category}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleKycAction(dr._id, 'reject')} className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}>✗ Reject</button>
                                    <button onClick={() => handleKycAction(dr._id, 'approve')} className="btn btn-success" style={{ fontWeight: 600 }}>✓ Approve</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid-2">
                <div className="card">
                    <h3 style={{ marginBottom: '12px' }}>📈 Key Metrics</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Cancellation Rate</span>
                            <span style={{ fontWeight: 700 }}>{stats?.cancellationRate}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${stats?.cancellationRate}%`, height: '100%', background: stats?.cancellationRate > 20 ? 'var(--danger)' : 'var(--success)', borderRadius: '3px', transition: 'width 1s ease' }} />
                        </div>
                        <div className="flex items-center justify-between">
                            <span style={{ color: 'var(--text-secondary)' }}>Completion Rate</span>
                            <span style={{ fontWeight: 700 }}>{stats?.totalRides ? ((stats.completedRides / stats.totalRides) * 100).toFixed(1) : 0}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${stats?.totalRides ? (stats.completedRides / stats.totalRides) * 100 : 0}%`, height: '100%', background: 'var(--success)', borderRadius: '3px', transition: 'width 1s ease' }} />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '12px' }}>🕐 Recent Rides</h3>
                    {stats?.recentRides?.slice(0, 5).map((ride) => (
                        <div key={ride._id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <span className="badge badge-neutral" style={{ marginRight: '8px' }}>{ride.vehicleType}</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(ride.completedAt).toLocaleDateString('en-IN')}</span>
                            </div>
                            <span style={{ fontWeight: 700 }}>₹{ride.actualFare}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
