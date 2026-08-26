import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

function EditPost({ currentUser, theme, toggleTheme }) {
  const { postId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('Robotics');
  const [content, setContent] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [eventType, setEventType] = useState('Competition');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  useEffect(() => {
    fetch(`/api/posts/${postId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch post');
        return res.json();
      })
      .then((data) => {
        setContent(data.content || '');
        setCategory(data.category || 'Robotics');
        setGithubLink(data.github_link || '');
        setEventType(data.event_type || 'Competition');
        setEventTime(data.event_time || '');
        setEventLocation(data.event_location || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        navigate('/');
      });
  }, [postId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      content,
      category,
      github_link: category === 'Events' ? '' : githubLink,
      event_type: category === 'Events' ? eventType : '',
      event_time: category === 'Events' ? eventTime : '',
      event_location: category === 'Events' ? eventLocation : '',
    };

    try {
      const res = await fetch(`/api/posts/${postId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (res.ok) {
        navigate('/');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update post.');
      }
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  if (loading) {
    return <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Loading post editor...</div>;
  }

  return (
    <>
      <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
      <main className="app-main-container">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Edit Post</h2>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            
            {/* Category Selection */}
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select 
                id="category" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
              >
                <option value="Robotics">Robotics & Microcontrollers</option>
                <option value="3D Modeling">3D Modeling & CAD</option>
                <option value="Software">Software & Web Engineering</option>
                <option value="Electronics">Electronics & PCB Design</option>
                <option value="AI">AI & Data Science</option>
                <option value="Events">Events</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Event Specific Fields (Conditional) */}
            {category === 'Events' && (
              <div id="event-fields-container" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', margin: '1rem 0' }}>
                <div className="form-group">
                  <label htmlFor="event_type">Event Type *</label>
                  <select 
                    id="event_type" 
                    value={eventType} 
                    onChange={(e) => setEventType(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                  >
                    <option value="Competition">Robot Competition / Tournament</option>
                    <option value="Workshop">Workshop / Hackathon</option>
                    <option value="Meetup">Team Meetup / Showcase</option>
                    <option value="Webinar">Webinar / Online Conference</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="event_time">Event Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    id="event_time" 
                    value={eventTime} 
                    onChange={(e) => setEventTime(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="event_location">Location / Link *</label>
                  <input 
                    type="text" 
                    id="event_location" 
                    value={eventLocation} 
                    onChange={(e) => setEventLocation(e.target.value)} 
                    placeholder="Physical address or online link"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                  />
                </div>
              </div>
            )}

            {/* GitHub Link Field (Conditional) */}
            {category !== 'Events' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="github_link">GitHub Repository (Optional)</label>
                <input 
                  type="url" 
                  id="github_link" 
                  value={githubLink} 
                  onChange={(e) => setGithubLink(e.target.value)} 
                  placeholder="https://github.com/your-team/repo"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                />
              </div>
            )}

            {/* Content Area */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="content">Content *</label>
              <textarea 
                id="content" 
                rows="5" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0 0 0' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Post</button>
              <Link to={`/`} className="btn btn-outline" style={{ background: '#e2e8f0', color: '#1e293b', textDecoration: 'none', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', fontWeight: 600, textAlign: 'center' }}>
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

export default EditPost;