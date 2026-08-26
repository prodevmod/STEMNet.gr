import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import logoPng from '../assets/logo.png';

export default function ServerError() {
    const [currentUser, setCurrentUser] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setCurrentUser(data?.user || null))
            .catch(() => setCurrentUser(null));
    }, []);

    return (
        <>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
            <main className="app-main-container">
                <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '480px', margin: '2rem auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={logoPng} alt="STEMNet Greece Logo" style={{ height: '72px', width: 'auto', marginBottom: '1.25rem' }} />
                    <h1 style={{ fontSize: '4.5rem', margin: '0 0 0.25rem 0', fontWeight: 800, lineHeight: 1 }}>500</h1>
                    <h2 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Server Error</h2>
                    <p style={{ color: '#64748b', marginBottom: '1.75rem', maxWidth: '400px' }}>
                        The server encountered an internal error while processing your request. Please try again later.
                    </p>
                    <div>
                        <Link to="/" className="btn btn-primary">← Back to Home</Link>
                    </div>
                </div>
            </main>
        </>
    );
}
