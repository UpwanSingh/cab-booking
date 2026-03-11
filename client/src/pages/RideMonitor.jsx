import { useState, useEffect } from 'react';
import api from '../api/axiosClient';

export default function RideMonitor() {
    const [rides, setRides] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => { fetchRides(); }, [filter, page]);

    const fetchRides = async () => {
        setLoading(true);
        try {
            const url = `/admin/rides?page=${page}&limit=15${filter ? `&status=${filter}` : ''}`;
            const { data } = await api.get(url);
            setRides(data.data.rides);
            setTotalPages(data.data.pages);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const statusBadge = (s) => {
        const map = { COMPLETED: 'badge-success', IN_PROGRESS: 'badge-info', REQUESTED: 'badge-warning', ACCEPTED: 'badge-info', ARRIVED: 'badge-info', NO_DRIVERS: 'badge-neutral' };
        return map[s] || 'badge-danger';
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading rides...</p></div>;

    return (
        <div className="page animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
                <h1>🛣️ Ride Monitor</h1>
                <div className="flex gap-1 flex-wrap">
                    {['', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
                        <button key={f} onClick={() => { setFilter(f); setPage(1); }} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {f || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr><th>Date</th><th>Passenger</th><th>Driver</th><th>Vehicle</th><th>Fare</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        {rides.map((r) => (
                            <tr key={r._id}>
                                <td>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                <td>{r.passengerId?.name || '—'}</td>
                                <td>{r.driverId?.userId?.name || '—'}</td>
                                <td><span className="badge badge-neutral">{r.vehicleType}</span></td>
                                <td style={{ fontWeight: 700 }}>₹{r.actualFare || r.estimatedFare}</td>
                                <td><span className={`badge ${statusBadge(r.status)}`}>{r.status.replace(/_/g, ' ')}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-center gap-1 mt-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} className="btn btn-secondary btn-sm" disabled={page === 1}>← Prev</button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="btn btn-secondary btn-sm" disabled={page === totalPages}>Next →</button>
            </div>
        </div>
    );
}
