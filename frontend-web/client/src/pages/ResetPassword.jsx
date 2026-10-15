import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function ResetPassword({ theme, toggleTheme }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('This link is missing a token.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
            } else {
                setError(data.error || 'Failed to reset password.');
            }
        } catch (err) {
            console.error(err);
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Navbar currentUser={null} theme={theme} toggleTheme={toggleTheme} />
            <main className="auth-page-wrapper">
                <div className="card narrow-card" style={{ padding: '2.5rem 2rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 700 }}>Reset Password</h2>

                    {success ? (
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ marginBottom: '1.5rem' }}>Your password has been reset.</p>
                            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                                Go to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center' }}>{error}</div>}
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        placeholder="Min 8 chars, 1 number, 1 special char"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <button type="submit" disabled={submitting || !token} className="btn btn-primary" style={{ padding: '0.75rem', fontWeight: 700 }}>
                                    {submitting ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>
                        </>
                    )}

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
                        <Link to="/login" style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Back to login</Link>
                    </p>
                </div>
            </main>
        </>
    );
}