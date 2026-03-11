import { useState, useEffect } from 'react';
import api from '../../core/api/axiosClient';

export default function Earnings() {
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState('daily');
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchEarnings(); }, [period]);

    const fetchEarnings = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/drivers/me/earnings?period=${period}`);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading earnings...</p></div>;

    return (
        <div className="page animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
                <h1>💰 Earnings</h1>
                <div className="flex gap-1">
                    {['daily', 'weekly', 'monthly'].map((p) => (
                        <button key={p} onClick={() => setPeriod(p)} className={`btn ${period === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid-3 mb-3">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>💵</div>
                    <div className="stat-value">₹{data?.totalEarnings?.toLocaleString()}</div>
                    <div className="stat-label">{period} earnings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>🚕</div>
                    <div className="stat-value">{data?.totalTrips}</div>
                    <div className="stat-label">{period} trips</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>📊</div>
                    <div className="stat-value">₹{data?.allTimeEarnings?.toLocaleString()}</div>
                    <div className="stat-label">All-time earnings</div>
                </div>
            </div>

            {/* Recent payments */}
            <div className="card">
                <h3 style={{ marginBottom: '16px' }}>Recent Transactions</h3>
                {data?.payments?.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '24px' }}>No transactions for this period.</p>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Amount</th><th>Your Payout</th><th>Method</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {data?.payments?.map((p) => (
                                    <tr key={p._id}>
                                        <td>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                        <td>₹{p.amount}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{p.driverPayout}</td>
                                        <td>{p.method}</td>
                                        <td><span className={`badge ${p.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
