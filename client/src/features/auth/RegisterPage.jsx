import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'PASSENGER' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await register(form);
            if (user.role === 'DRIVER') navigate('/driver');
            else navigate('/');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="card animate-slideUp" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center mb-3">
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🚕</div>
                    <h1>Join <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>CabGo</span></h1>
                    <p className="mt-1">Create your account</p>
                </div>

                {error && <div className="badge badge-danger" style={{ width: '100%', padding: '12px', marginBottom: '16px', justifyContent: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input className="input" name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input className="input" name="phone" type="tel" placeholder="9876543210" value={form.phone} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Email (optional)</label>
                        <input className="input" name="email" type="email" placeholder="john@example.com" value={form.email} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input className="input" name="password" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
                    </div>
                    <div className="form-group">
                        <label>Register as</label>
                        <select className="input" name="role" value={form.role} onChange={handleChange}>
                            <option value="PASSENGER">🧑 Passenger</option>
                            <option value="DRIVER">🚗 Driver</option>
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        {loading ? <><div className="spinner" style={{ width: '18px', height: '18px' }} /> Creating...</> : 'Create Account'}
                    </button>
                </form>

                <p className="text-center mt-2" style={{ fontSize: '0.85rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
                </p>
            </div>
        </div>
    );
}
