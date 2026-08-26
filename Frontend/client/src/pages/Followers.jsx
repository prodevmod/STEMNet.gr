import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SafeImage = ({ src, alt, className, style }) => {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <span
                className={className}
                style={{
                    ...style,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '50%'
                }}
            >
                {alt}
            </span>
        );
    }

    return <img src={src} alt={alt} className={className} style={style} onError={() => setError(true)} me />;
};

export default function Followers({ currentUser, setCurrentUser, theme, toggleTheme }) {
    const { username } = useParams();
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/followers/${username}`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : { followers: [] }))
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.followers || data.users || []);
                setFollowers(list);
            })
            .catch((err) => console.error('Error fetching followers:', err))
            .finally(() => setLoading(false));
    }, [username]);

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>People following @{username}</h2>
                    <Link to={`/profile/${username}`} style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.9rem', display: 'inline-block', marginTop: '0.5rem' }}>
                        Back to profile
                    </Link>
                </div>

                {loading ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Loading followers...
                    </div>
                ) : followers.length === 0 ? (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No followers found yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {followers.map((u) => (
                            <div key={u.id || u.username} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <SafeImage src={u.profile_pic} alt={u.username?.[0]?.toUpperCase()} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
                                    <Link to={`/profile/${u.username}`} style={{ textDecoration: 'none', fontWeight: 'bold', color: 'inherit' }}>
                                        @{u.username}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}