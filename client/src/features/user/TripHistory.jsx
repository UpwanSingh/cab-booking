import { useState, useEffect } from 'react';
import api from '../../core/api/axiosClient';

export default function TripHistory() {
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => { fetchRides(); }, [page]);

    const fetchRides = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/rides/history?page=${page}&limit=10`);
            setRides(data.data.rides);
            setTotalPages(data.data.pages);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const statusBadge = (status) => {
        const map = {
            COMPLETED: 'badge-success', IN_PROGRESS: 'badge-info', REQUESTED: 'badge-warning',
            ACCEPTED: 'badge-info', ARRIVED: 'badge-info',
            CANCELLED_BY_PASSENGER: 'badge-danger', CANCELLED_BY_DRIVER: 'badge-danger', NO_DRIVERS: 'badge-neutral',
        };
        return map[status] || 'badge-neutral';
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading history...</p></div>;

    return (
        <div className="page animate-fadeIn">
            <h1 style={{ marginBottom: '24px' }}>📜 Trip History</h1>

            {rides.length === 0 ? (
                <div className="card text-center" style={{ padding: '48px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🚕</div>
                    <h3>No rides yet</h3>
                    <p>Your trip history will appear here.</p>
                </div>
            ) : (
                <>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Pickup</th>
                                    <th>Drop</th>
                                    <th>Vehicle</th>
                                    <th>Fare</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rides.map((ride) => (
                                    <tr key={ride._id}>
                                        <td>{new Date(ride.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ride.pickup?.address || 'N/A'}</td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ride.drop?.address || 'N/A'}</td>
                                        <td><span className="badge badge-neutral">{ride.vehicleType}</span></td>
                                        <td style={{ fontWeight: 700 }}>₹{ride.actualFare || ride.estimatedFare}</td>
                                        <td><span className={`badge ${statusBadge(ride.status)}`}>{ride.status.replace(/_/g, ' ')}</span></td>
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
                </>
            )}
        </div>
    );
}
