import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';

export default function LoginPage() {
    const { login, guestLogin } = useAuth();
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(phone, password);
            if (user.role === 'ADMIN') navigate('/admin');
            else if (user.role === 'DRIVER') navigate('/driver');
            else navigate('/');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setGuestLoading(true);
        setError('');
        try {
            await guestLogin();
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Guest login failed');
        } finally {
            setGuestLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="card animate-slideUp" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-3">
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚕</div>
                    <h1>Welcome to <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CabGo</span></h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Sign in to book your ride</p>
                </div>

                {error && <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '16px', justifyContent: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input className="input" type="tel" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="input" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <><div className="spinner" style={{ width: '18px', height: '18px' }} /> Signing in...</> : '🔐 Sign In'}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>or</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <button onClick={handleGuestLogin} className="btn btn-secondary btn-full btn-lg" disabled={guestLoading} style={{ border: '1px dashed var(--accent)' }}>
                    {guestLoading ? <><div className="spinner" style={{ width: '18px', height: '18px' }} /> Creating account...</> : '⚡ Continue as Guest'}
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                    Instantly creates a fresh account — no sign-up required
                </p>

                <p className="text-center mt-2" style={{ fontSize: '0.85rem' }}>
                    Don't have an account? <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Register</Link>
                </p>
            </div>
        </div>
    );
}
