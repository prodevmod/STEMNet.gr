import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Notifications({ currentUser, theme, toggleTheme, setHasUnreadNotifications }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch the notifications
        fetch('/api/notifications', { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch notifications');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setNotifications(data);
                } else {
                    setNotifications([]);
                }
            })
            .catch(err => {
                console.error('Error fetching notifications:', err);
                setNotifications([]);
            })
            .finally(() => {
                setLoading(false);
            });

        // 2. Mark them as read in the backend so the bell stops glowing
        fetch('/api/notifications/read', { method: 'POST', credentials: 'include' })
            .then(() => {
                // If you pass this prop from App.jsx, it will instantly clear the bell
                if (setHasUnreadNotifications) {
                    setHasUnreadNotifications(false);
                }
            })
            .catch(err => console.error('Error marking as read:', err));
    }, [setHasUnreadNotifications]);

    return (
        <div>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
            <main className="app-main-container" style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }}>
                <h2 style={{ color: '#ccff00' }}>Notifications</h2>
                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#ccff00' }}>Loading notifications...</div>
                ) : notifications.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No notifications yet.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {notifications.map((notif) => (
                            <div 
                                key={notif.id} 
                                className="card" 
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    background: notif.is_read ? 'var(--card-bg)' : 'var(--border-color)',
                                    padding: '1rem'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Link to={`/profile/${notif.actor_username}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none' }}>
                                        @{notif.actor_username}
                                    </Link>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {notif.type === 'like' && 'liked your post.'}
                                        {notif.type === 'reply' && 'replied to your post.'}
                                        {notif.type === 'follow' && 'started following you.'}
                                    </span>
                                </div>
                                {notif.post_id && (
                                    <Link to={`/posts/${notif.post_id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', textDecoration: 'none', padding: '0.3rem 0.6rem' }}>
                                        View
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}