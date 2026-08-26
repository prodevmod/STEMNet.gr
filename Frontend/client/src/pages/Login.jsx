import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Login({ setCurrentUser, theme, toggleTheme }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    username: identifier,
                    email: identifier,
                    identifier: identifier,
                    password: password 
                }),
            });

            const data = await res.json();
            if (res.ok && data.user) {
                setCurrentUser(data.user);
                navigate('/');
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('An error occurred during login.');
        }
    };

    return (
        <>
            <Navbar currentUser={null} theme={theme} toggleTheme={toggleTheme} />

            <main className="auth-page-wrapper">
                <div className="card narrow-card" style={{ padding: '2.5rem 2rem' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontWeight: 700 }}>Log in to STEMNet</h2>
                    
                    {error && <div className="alert alert-danger" style={{ marginBottom: '1rem', color: '#ef4444', textAlign: 'center' }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Username or Email</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                placeholder="Username or email address"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Enter your password"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit', boxSizing: 'border-box' }}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.75rem', fontWeight: 700, width: '100%' }}>
                            Log In
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                        Don&apos;t have an account? <Link to="/register" style={{ fontWeight: 600 }}>Sign up</Link>
                    </p>
                </div>
            </main>
        </>
    );
}