import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    const links = {
        PASSENGER: [
            { to: '/', label: '🏠 Book Ride' },
            { to: '/history', label: '📜 History' },
            { to: '/wallet', label: '👛 Wallet' },
        ],
        DRIVER: [
            { to: '/driver', label: '🚗 Dashboard' },
            { to: '/driver/earnings', label: '💰 Earnings' },
            { to: '/history', label: '📜 History' },
        ],
        ADMIN: [
            { to: '/admin', label: '📊 Dashboard' },
            { to: '/admin/drivers', label: '🚗 Drivers' },
            { to: '/admin/rides', label: '🛣️ Rides' },
        ],
    };

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                🚕 <span>CabGo</span>
            </Link>

            <div className="navbar-links">
                {(links[user.role] || []).map((l) => (
                    <Link key={l.to} to={l.to} className={isActive(l.to)}>{l.label}</Link>
                ))}
            </div>

            <div className="navbar-user">
                <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                        {(user.name || 'U')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.name}</span>
                </Link>
                <div className="badge badge-info">{user.role}</div>
                <button onClick={logout} className="btn btn-secondary btn-sm">Logout</button>
            </div>
        </nav>
    );
}
