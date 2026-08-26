import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SafeAvatar = ({ src, username }) => {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: 'var(--text-color)',
                    flexShrink: 0
                }}
            >
                {username ? username[0].toUpperCase() : 'U'}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={username}
            onError={() => setError(true)}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
    );
};

export default function Following({ currentUser, setCurrentUser, theme, toggleTheme }) {
    const { username } = useParams();
    const [followingList, setFollowingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchFollowing = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/following/${username}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setFollowingList(data);
                } else {
                    setError('Failed to load following list.');
                }
            } catch (err) {
                console.error('Error fetching following list:', err);
                setError('Server error while loading list.');
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchFollowing();
        }
    }, [username]);

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />

            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to={`/profile/${username}`} style={{ textDecoration: 'none', color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                        ← Back to @{username}
                    </Link>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Following</h2>
                </div>

                {loading && (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Loading following list...
                    </div>
                )}

                {error && (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    followingList.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            @{username} is not following anyone yet.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {followingList.map((user) => (
                                <div key={user.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <SafeAvatar src={user.profile_pic} username={user.username} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Link
                                            to={`/profile/${user.username}`}
                                            style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: '1rem', display: 'block' }}
                                        >
                                            @{user.username}
                                        </Link>
                                        {user.bio && (
                                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </main>
        </>
    );
}