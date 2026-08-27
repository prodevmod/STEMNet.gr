import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
        return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getPostImage = (item) => {
    if (!item) return '';
    const raw = item.media_path || item.image_url || item.image || item.media_url;
    return resolveImageUrl(raw);
};

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
  
  const [existingImage, setExistingImage] = useState('');
  const [newImageFile, setNewImageFile] = useState(null);

  useEffect(() => {
    fetch(`/api/posts/${postId}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch post');
        return res.json();
      })
      .then((data) => {
        console.log('Fetched post response:', data);

        const postData = data.post || data;

        setContent(postData.content || '');
        setCategory(postData.category || 'Robotics');
        setGithubLink(postData.github_link || '');
        setEventType(postData.event_type || 'Competition');
        setEventTime(postData.event_time || '');
        setEventLocation(postData.event_location || '');
        setExistingImage(getPostImage(postData));
        
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        navigate('/');
      });
  }, [postId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('content', content);
    formData.append('category', category);
    
    if (category === 'Events') {
      formData.append('event_type', eventType);
      formData.append('event_time', eventTime);
      formData.append('event_location', eventLocation);
    } else {
      formData.append('github_link', githubLink);
    }

    if (newImageFile) {
      formData.append('image', newImageFile);
    }

    try {
      const res = await fetch(`/api/posts/${postId}/edit`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        navigate(`/post/${postId}`);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to update post.');
      }
    } catch (err) {
      console.error('Error updating post:', err);
    }
  };

  // Theme-aware styles for buttons and containers
  const cancelBtnStyle = {
    background: theme === 'dark' ? '#262626' : '#e2e8f0',
    color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
    border: '1px solid var(--border-color, #333333)',
    cursor: 'pointer',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    textAlign: 'center',
  };

  const imagePreviewBoxStyle = {
    marginBottom: '1rem',
    padding: '0.5rem',
    background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderRadius: '8px',
    border: '1px solid var(--border-color, #333333)',
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

            {/* Image Preview & Upload Area */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Post Image</label>
              
              {existingImage && !newImageFile && (
                <div style={imagePreviewBoxStyle}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Current Image:</p>
                  <img 
                    src={existingImage} 
                    alt="Current post attachment" 
                    style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                </div>
              )}

              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewImageFile(e.target.files[0])}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                Upload a new image to replace the current one, or leave blank to keep it.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0 0 0' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Post</button>
              <button 
                type="button" 
                onClick={() => navigate(-1)} 
                className="btn btn-outline" 
                style={cancelBtnStyle}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

export default EditPost;