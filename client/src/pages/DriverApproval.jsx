import { useState, useEffect } from 'react';
import api from '../api/axiosClient';

export default function DriverApproval() {
    const [drivers, setDrivers] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDrivers(); }, [filter]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const url = filter ? `/admin/drivers?status=${filter}` : '/admin/drivers';
            const { data } = await api.get(url);
            setDrivers(data.data.drivers);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleAction = async (id, action) => {
        try {
            await api.patch(`/admin/drivers/${id}/${action}`);
            fetchDrivers();
        } catch (err) { console.error(err); }
    };

    const statusBadge = (s) => {
        if (s === 'APPROVED') return 'badge-success';
        if (s === 'REJECTED') return 'badge-danger';
        return 'badge-warning';
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading drivers...</p></div>;

    return (
        <div className="page animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
                <h1>🚗 Driver Management</h1>
                <div className="flex gap-1">
                    {['', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {f || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {drivers.length === 0 ? (
                <div className="card text-center" style={{ padding: '48px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚗</div>
                    <h3>No drivers found</h3>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Name</th><th>Phone</th><th>License</th><th>Vehicle</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {drivers.map((d) => (
                                <tr key={d._id}>
                                    <td style={{ fontWeight: 600 }}>{d.userId?.name}</td>
                                    <td>{d.userId?.phone}</td>
                                    <td>{d.licenseNumber}</td>
                                    <td>{d.vehicleId ? `${d.vehicleId.make} ${d.vehicleId.model}` : '—'}</td>
                                    <td>⭐ {d.avgRating?.toFixed(1)}</td>
                                    <td><span className={`badge ${statusBadge(d.approvalStatus)}`}>{d.approvalStatus}</span></td>
                                    <td>
                                        <div className="flex gap-1">
                                            {d.approvalStatus !== 'APPROVED' && (
                                                <button onClick={() => handleAction(d._id, 'approve')} className="btn btn-success btn-sm">Approve</button>
                                            )}
                                            {d.approvalStatus !== 'REJECTED' && (
                                                <button onClick={() => handleAction(d._id, 'reject')} className="btn btn-danger btn-sm">Reject</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
