import { useState, useEffect } from 'react';
import { useAuth } from '../../core/context/AuthContext';
import api from '../../core/api/axiosClient';

export default function Wallet() {
    const { user, setUser } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(true);
    const [success, setSuccess] = useState('');

    const presetAmounts = [100, 250, 500, 1000, 2000, 5000];

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data } = await api.get('/payments/history?limit=20');
            setTransactions(data.data.payments || []);
        } catch (err) {
            console.error(err);
        } finally {
            setTxLoading(false);
        }
    };

    const handleTopup = async () => {
        const num = parseFloat(amount);
        if (!num || num <= 0) return;
        setLoading(true);
        try {
            const { data } = await api.patch('/auth/wallet/topup', { amount: num });
            setUser(prev => ({ ...prev, wallet: data.data.wallet }));
            setSuccess(`₹${num} added to your wallet!`);
            setAmount('');
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const statusColors = { COMPLETED: 'var(--success)', PENDING: 'var(--warning)', REFUNDED: 'var(--info)', FAILED: 'var(--danger)' };

    return (
        <div className="page animate-fadeIn">
            <h1>👛 My Wallet</h1>

            <div className="grid-2 mt-3">
                {/* Balance & Top-up Card */}
                <div className="card">
                    <div style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                        borderRadius: 'var(--radius-md)', padding: '32px', marginBottom: '24px',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ position: 'absolute', bottom: '-30px', left: '-10px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Available Balance</div>
                        <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', marginTop: '8px' }}>₹{user?.wallet?.balance?.toLocaleString() || '0'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>{user?.wallet?.currency || 'INR'} • {user?.name}</div>
                    </div>

                    <h3 style={{ marginBottom: '12px' }}>Add Money</h3>

                    {success && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '12px', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>
                            ✅ {success}
                        </div>
                    )}

                    {/* Quick amounts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                        {presetAmounts.map(a => (
                            <button key={a} className={`btn ${amount === String(a) ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => setAmount(String(a))}>
                                ₹{a.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    <div className="form-group">
                        <label>Custom Amount</label>
                        <input type="number" className="input" placeholder="Enter amount..." value={amount}
                            onChange={(e) => setAmount(e.target.value)} min="1" max="50000" />
                    </div>

                    <button onClick={handleTopup} className="btn btn-primary btn-full btn-lg mt-2" disabled={loading || !amount}>
                        {loading ? 'Processing...' : `💳 Add ₹${amount || '0'} to Wallet`}
                    </button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                        Simulated payment • No real charge
                    </p>
                </div>

                {/* Transaction History */}
                <div className="card">
                    <h3 style={{ marginBottom: '16px' }}>Transaction History</h3>
                    {txLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <div className="spinner" style={{ width: '24px', height: '24px' }} />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                            <p>No transactions yet</p>
                            <p style={{ fontSize: '0.85rem' }}>Complete a ride to see payment history here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                            {transactions.map((tx) => (
                                <div key={tx._id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {tx.method === 'CASH' ? '💵' : tx.method === 'WALLET' ? '👛' : '💳'} Ride Payment
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{tx.amount}</div>
                                        <div className="badge" style={{ background: statusColors[tx.status] || 'var(--text-muted)', fontSize: '0.65rem' }}>{tx.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
