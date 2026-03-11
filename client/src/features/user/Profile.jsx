import { useState, useEffect } from 'react';
import { useAuth } from '../../core/context/AuthContext';
import api from '../../core/api/axiosClient';

export default function Profile() {
    const { user, setUser } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [loading, setLoading] = useState(false);
    const [driverProfile, setDriverProfile] = useState(null);
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user?.role === 'DRIVER') {
            api.get('/drivers/me').then(({ data }) => setDriverProfile(data.data.driver)).catch(() => { });
        }
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { data } = await api.patch('/auth/profile', { name, email });
            setUser(prev => ({ ...prev, name: data.data.user.name, email: data.data.user.email }));
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Recently';
    const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="page animate-fadeIn">
            <h1>👤 My Profile</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', marginTop: '24px' }}>
                {/* Profile card */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.5rem', fontWeight: 700, color: 'white',
                        margin: '0 auto 16px', border: '3px solid var(--border)',
                    }}>
                        {initials}
                    </div>
                    <h2 style={{ marginBottom: '4px' }}>{user?.name}</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user?.phone}</p>
                    <div className="badge badge-info" style={{ marginTop: '8px' }}>{user?.role}</div>

                    <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-hover)' }}>
                                    ₹{user?.wallet?.balance?.toLocaleString() || '0'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Wallet</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {memberSince}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Member Since</div>
                            </div>
                        </div>
                    </div>

                    {/* Driver-specific stats */}
                    {driverProfile && (
                        <div style={{ borderTop: '1px solid var(--border)', marginTop: '20px', paddingTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Driver Stats</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>⭐ {driverProfile.avgRating?.toFixed(1) || '0.0'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rating</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{driverProfile.totalTrips || 0}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trips</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>₹{driverProfile.totalEarnings?.toLocaleString() || '0'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Earned</div>
                                </div>
                            </div>

                            {driverProfile.vehicleId && (
                                <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', padding: '12px', marginTop: '12px', border: '1px solid var(--border)', textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Vehicle</div>
                                    <div style={{ fontWeight: 600 }}>{driverProfile.vehicleId.make} {driverProfile.vehicleId.model}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {driverProfile.vehicleId.color} • {driverProfile.vehicleId.plateNumber} • {driverProfile.vehicleId.category}
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: '12px' }}>
                                <span className={`badge ${driverProfile.approvalStatus === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                                    {driverProfile.approvalStatus === 'APPROVED' ? '✅ Approved' : '⏳ ' + driverProfile.approvalStatus}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Edit form */}
                <div className="card">
                    <h3 style={{ marginBottom: '20px' }}>Edit Profile</h3>

                    {success && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px', color: 'var(--success)', fontSize: '0.9rem' }}>
                            ✅ {success}
                        </div>
                    )}

                    <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="text" className="input" value={user?.phone || ''} disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phone number cannot be changed</span>
                    </div>

                    <div className="form-group">
                        <label>Role</label>
                        <input type="text" className="input" value={user?.role || ''} disabled
                            style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                    </div>

                    <button onClick={handleSave} className="btn btn-primary btn-lg mt-2" disabled={loading} style={{ minWidth: '200px' }}>
                        {loading ? 'Saving...' : '💾 Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
