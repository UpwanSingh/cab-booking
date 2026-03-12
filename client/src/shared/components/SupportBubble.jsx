import { useState } from 'react';

export default function SupportBubble() {
    const [isOpen, setIsOpen] = useState(false);

    // Replace this with the actual phone number
    const SUPPORT_NUMBER = '919876543210';
    const whatsappUrl = `https://wa.me/${SUPPORT_NUMBER}?text=${encodeURIComponent('Hi CabGo Support, I need help!')}`;

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 99999 }}>
            {isOpen && (
                <div className="card animate-slideUp" style={{
                    position: 'absolute', bottom: '70px', right: '0', width: '250px',
                    padding: '16px', background: 'var(--bg-card)',
                    border: '1px solid var(--accent)', boxShadow: 'var(--shadow-lg)'
                }}>
                    <h4 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>💬</span> Need Help?
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Connect instantly with our support team on WhatsApp.
                    </p>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-full"
                        style={{ background: '#25D366', color: '#fff', textDecoration: 'none' }}
                        onClick={() => setIsOpen(false)}
                    >
                        Chat on WhatsApp
                    </a>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'var(--accent-gradient)', border: 'none',
                    color: 'white', fontSize: '1.5rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)'
                }}
                aria-label="Support Contact"
            >
                {isOpen ? '✕' : '💬'}
            </button>
        </div>
    );
}
