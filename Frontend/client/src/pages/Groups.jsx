import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Groups({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch groups');
        return res.json();
      })
      .then((data) => {
        setGroups(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error('Error fetching groups:', err);
        setGroups([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

      <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-primary)' }}>Community Groups</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
              Connect with specialized robotics, 3D printing, and software teams.
            </p>
          </div>
          {currentUser && (
            <Link to="/create-group" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              + Create Group
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#ccff00' }}>
              Loading community groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>No community groups have been created yet.</p>
              {currentUser && (
                <Link to="/create-group" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                  Be the first to create one
                </Link>
              )}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <h3 style={{ margin: 0 }}>
                      <Link to={`/groups/${group.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                        {group.name}
                      </Link>
                    </h3>
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Created by <Link to={`/profile/${group.username}`}>@{group.username}</Link>
                  </p>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.4' }}>
                    {group.description}
                  </p>
                </div>
                <div>
                  <Link 
                    to={`/groups/${group.id}`} 
                    className={`btn btn-outline ${theme === 'dark' ? 'force-white' : ''}`}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    View Group ↗
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}