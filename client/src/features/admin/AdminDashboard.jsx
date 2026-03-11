import { useState, useEffect } from 'react';
import api from '../../core/api/axiosClient';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/analytics');
            setStats(data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading analytics...</p></div>;

    return (
        <div className="page animate-fadeIn">
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
