import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CreatePost({ currentUser, theme, toggleTheme }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const parentPostId = searchParams.get('reply_to');
    const groupId = searchParams.get('group_id');

    const [parentPost, setParentPost] = useState(null);
    const [category, setCategory] = useState('Robotics');
    const [content, setContent] = useState('');
    const [media, setMedia] = useState(null);
    const [githubLink, setGithubLink] = useState('');
    const [eventType, setEventType] = useState('Competition');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch parent post details if this is a reply
    useEffect(() => {
        if (parentPostId) {
            fetch(`/api/posts/${parentPostId}`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    if (data && data.id) {
                        setParentPost(data);
                    }
                })
                .catch(err => console.error('Failed to load parent post:', err));
        }
    }, [parentPostId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        formData.append('content', content);
        formData.append('category', category);
        if (media) formData.append('media', media);
        if (groupId) formData.append('group_id', groupId);
        if (parentPostId) formData.append('reply_to', parentPostId);

        if (category === 'Events') {
            formData.append('event_type', eventType);
            formData.append('event_time', eventTime);
            formData.append('event_location', eventLocation);
        } else {
            if (githubLink) formData.append('github_link', githubLink);
        }

        try {
            // ⚠️ FIXED: Updated endpoint to match Flask route "/api/posts/create"
            const response = await fetch('/api/posts/create', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (response.ok) {
                if (groupId) {
                    navigate(`/groups/${groupId}`);
                } else if (parentPostId) {
                    navigate(`/posts/${parentPostId}`);
                } else {
                    navigate('/');
                }
            } else {
                const errData = await response.json();
                alert(errData.error || 'Failed to create post.');
            }
        } catch (err) {
            console.error('Submission error:', err);
            alert('An error occurred while publishing your post.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
            <main className="app-main-container" style={{ padding: '2rem 1rem' }}>
                <div className="card" style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '2rem' }}>
                    <h2 style={{ marginBottom: '0.5rem', color: '#ccff00' }}>
                        {parentPost ? `Reply to @${parentPost.username}` : groupId ? 'Post in Group' : 'Share with the Community'} 
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {parentPost 
                            ? 'Your reply will be linked directly to this post thread .' 
                            : groupId 
                            ? "Publish an update directly to this group's members ." 
                            : 'Publish a project update, ask a robotics question, or share code .'}
                    </p>

                            {parentPost && (
                                <div style={{ 
                                    background: theme === 'dark' ? '#000000' : 'var(--bg-color)', 
                                    color: theme === 'dark' ? '#ffffff' : 'inherit',
                                    borderLeft: '4px solid var(--primary-color)', 
                                    padding: '0.75rem 1rem', 
                                    marginBottom: '1.5rem', 
                                    borderRadius: 'var(--radius)', 
                                    fontSize: '0.9rem' 
                                }}>
                                    <span style={{ fontWeight: '600', color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                                        Replying to @{parentPost.username}:
                                    </span>
                                    <p style={{ 
                                        margin: '0.25rem 0 0 0', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        display: '-webkit-box', 
                                        WebkitLineClamp: 2, 
                                        WebkitBoxOrient: 'vertical', 
                                        color: theme === 'dark' ? '#ffffff' : 'inherit' 
                                    }}>
                                        {parentPost.content}
                                    </p>
                                </div>
                            )}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Post Content *</label>
                            <textarea 
                                id="content" 
                                name="content" 
                                rows="5" 
                                required 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What are you working on?" 
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', resize: 'vertical', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }}
                            ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="media" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Attach Media (Optional) </label>
                                <input 
                                    type="file" 
                                    id="media" 
                                    name="media" 
                                    accept="image/*,video/mp4,video/webm" 
                                    onChange={(e) => setMedia(e.target.files[0])}
                                    style={{ background: 'var(--bg-color)', color: 'inherit' }} 
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label htmlFor="category" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Category *</label>
                            <select 
                                id="category" 
                                name="category" 
                                required 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }}
                            >
                                <option value="Robotics">Robotics & Microcontrollers </option>
                                <option value="3D Modeling">3D Modeling & CAD </option>
                                <option value="Software">Software & Web Engineering </option>
                                <option value="Electronics">Electronics & PCB Design </option>
                                <option value="AI">AI & Data Science </option>
                                <option value="Events">Events </option>
                                <option value="Other">Other </option>
                            </select>
                        </div>

                        {/* Event Specific Fields */}
                        {category === 'Events' && (
                            <div id="event-fields-container" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="event_type" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Event Type *</label>
                                    <select 
                                        id="event_type" 
                                        name="event_type" 
                                        value={eventType}
                                        onChange={(e) => setEventType(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }}
                                    >
                                        <option value="Competition">Robot Competition / Tournament </option>
                                        <option value="Workshop">Workshop / Hackathon </option>
                                        <option value="Meetup">Team Meetup / Showcase </option>
                                        <option value="Webinar">Webinar / Online Conference </option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                    <label htmlFor="event_time" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Event Date & Time *</label>
                                    <input 
                                        type="datetime-local" 
                                        id="event_time" 
                                        name="event_time" 
                                        required
                                        value={eventTime}
                                        onChange={(e) => setEventTime(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }} 
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                    <label htmlFor="event_location" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' }}>Location / Link *</label>
                                    <input 
                                        type="text" 
                                        id="event_location" 
                                        name="event_location" 
                                        required
                                        value={eventLocation}
                                        onChange={(e) => setEventLocation(e.target.value)}
                                        placeholder="e.g. Athens Tech College or Online via Zoom" 
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }} 
                                    />
                                </div>
                            </div>
                        )}

                        {/* GitHub Link Field */}
                        {category !== 'Events' && (
                            <div className="form-group" id="github-field-container" style={{ marginBottom: '1rem' }}>
                                <label htmlFor="github_link" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>GitHub Repository (Optional) </label>
                                <input 
                                    type="url" 
                                    id="github_link" 
                                    name="github_link" 
                                    value={githubLink}
                                    onChange={(e) => setGithubLink(e.target.value)}
                                    placeholder="https://github.com/your-team/repo" 
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)', color: 'inherit', boxSizing: 'border-box' }} 
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer' }}>
                                {submitting ? 'Publishing...' : parentPost ? 'Post Reply' : 'Publish Post'} 
                            </button>
                            <button 
                                type="button" 
                                onClick={() => navigate(groupId ? `/groups/${groupId}` : '/')} 
                                className={`btn btn-outline ${theme === 'dark' ? 'force-white' : ''}`} 
                                style={{ 
                                    textAlign: 'center', 
                                    textDecoration: 'none', 
                                    padding: '0.75rem 1rem', 
                                    borderRadius: 'var(--radius)', 
                                    fontWeight: '600', 
                                    background: 'transparent', 
                                    cursor: 'pointer', 
                                    color: theme === 'dark' ? '#ffffff' : '#000000', 
                                    borderColor: theme === 'dark' ? '#ffffff' : '#000000' 
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}