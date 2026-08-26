import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CreateGroup({ currentUser, theme, toggleTheme }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);

    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create group');
      }

      const data = await res.json();
      navigate(data.group_id ? `/groups/${data.group_id}` : '/groups');
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />

      <main className="app-main-container" style={{ maxWidth: '600px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Create a Community Group</h2>
            
            {/* Cancel Button Forced White */}
            <Link 
              to="/groups" 
              className="btn btn-outline" 
              style={{ 
                fontSize: '0.8rem', 
                padding: '0.4rem 0.8rem', 
                color: '#ffffff', 
                borderColor: '#ffffff',
                backgroundColor: 'transparent'
              }}
            >
              <span style={{ color: '#ffffff' }}>← Cancel</span>
            </Link>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Local Robotics Hobbyists"
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group about? Who should join?"
                rows={4}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 'bold' }}
            >
              {submitting ? 'Creating Group...' : 'Create Group'}
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}