import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function CreatePost({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
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
            const response = await fetch('https://stemnet.app/api/posts/create', {
                credentials: 'include',
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
        <View>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main className="app-main-container" style={{ padding: '2rem 1rem' }}>
                <View className="card" style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '2rem' }}>
                    <Text style={{ marginBottom: '0.5rem', color: '#ccff00' }}>
                        {parentPost ? `Reply to @${parentPost.username}` : groupId ? 'Post in Group' : 'Share with the Community'} 
                    </Text>
                    <Text style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {parentPost 
                            ? 'Your reply will be linked directly to this post thread .' 
                            : groupId 
                            ? "Publish an update directly to this group's members ." 
                            : 'Publish a project update, ask a robotics question, or share code .'}
                    </Text>

                            {parentPost && (
                                <View style={{ 
                                    background: theme === 'dark' ? '#000000' : 'var(--bg-color)', 
                                    color: theme === 'dark' ? '#ffffff' : 'inherit',
                                    borderLeft: '4px solid var(--primary-color)', 
                                    padding: '0.75rem 1rem', 
                                    marginBottom: '1.5rem', 
                                    borderRadius: 'var(--radius)', 
                                    fontSize: '0.9rem' 
                                }}>
                                    <Text style={{ fontWeight: '600', color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                                        Replying to @{parentPost.username}:
                                    </Text>
                                    <Text style={{ 
                                        margin: '0.25rem 0 0 0', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        display: '-webkit-box', 
                                        WebkitLineClamp: 2, 
                                        WebkitBoxOrient: 'vertical', 
                                        color: theme === 'dark' ? '#ffffff' : 'inherit' 
                                    }}>
                                        {parentPost.content}
                                    </Text>
                                </View>
                            )}
                    <form onSubmit={handleSubmit}>
                        <View className="form-group" style={{ marginBottom: '1rem' }}>
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
                        </View>

                        <View style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <View className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor="media" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.4rem' }}>Attach Media (Optional) </label>
                                <input 
                                    type="file" 
                                    id="media" 
                                    name="media" 
                                    accept="image/*,video/mp4,video/webm" 
                                    onChange={(e) => setMedia(e.target.files[0])}
                                    style={{ background: 'var(--bg-color)', color: 'inherit' }} 
                                />
                            </View>
                        </View>

                        <View className="form-group" style={{ marginBottom: '1rem' }}>
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
                        </View>

                        {/* Event Specific Fields */}
                        {category === 'Events' && (
                            <View id="event-fields-container" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                                <View className="form-group">
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
                                </View>

                                <View className="form-group" style={{ marginTop: '0.75rem' }}>
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
                                </View>

                                <View className="form-group" style={{ marginTop: '0.75rem' }}>
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
                                </View>
                            </View>
                        )}

                        {/* GitHub Link Field */}
                        {category !== 'Events' && (
                            <View className="form-group" id="github-field-container" style={{ marginBottom: '1rem' }}>
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
                            </View>
                        )}

                        <View style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <TouchableOpacity type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', cursor: 'pointer' }}>
                                {submitting ? 'Publishing...' : parentPost ? 'Post Reply' : 'Publish Post'} 
                            </TouchableOpacity>
                            <TouchableOpacity 
                                type="button" 
                                onPress={() => navigate(groupId ? `/groups/${groupId}` : '/')} 
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
                            </TouchableOpacity>
                        </View>
                    </form>
                </View>
            </main>
        </View>
    );
}



const { width } = Dimensions.get('window');

// 1. Color Palette (Light & Dark Theme Tokens)
export const theme = {
  light: {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    text: '#000000',
    borderColor: '#e2e8f0',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#475569',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#047857',
    badgeBorder: '#10b981',
  },
  dark: {
    bg: '#000000',
    cardBg: '#121212',
    text: '#ffffff',
    borderColor: '#333333',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#94a3b8',
    headerBg: '#000000',
    headerText: '#ffffff',
    badgeBg: 'rgba(204, 255, 0, 0.12)',
    badgeText: '#ccff00',
    badgeBorder: '#ccff00',
  },
};

// 2. React Native Stylesheet
export const styles = StyleSheet.create({
  // --- Containers & Layout ---
  mainContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  brand: {
    fontWeight: '700',
    fontSize: 20,
    color: '#ccff00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  // --- Cards ---
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#121212',
    borderColor: '#333333',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 13,
    color: '#64748b',
  },

  // --- Buttons ---
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  btnPrimary: {
    backgroundColor: '#ccff00',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    // Emulates retro 3D shadow in RN:
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnOutlineText: {
    color: '#000000',
    fontWeight: '500',
  },
  btnGithub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#24292e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnGithubText: {
    color: '#ffffff',
    fontSize: 13,
  },

  // --- Form Controls ---
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },

  // --- Hero Section ---
  hero: {
    backgroundColor: '#0f172a',
    paddingVertical: 40,
    paddingHorizontal: 32,
    borderRadius: 6,
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ffffff',
  },
  heroText: {
    color: '#ffffff',
    marginBottom: 24,
    fontSize: 17,
  },

  // --- Flash Messages ---
  flash: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  flashText: {
    fontSize: 14,
  },
  flashInfo: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd', borderWidth: 1 },
  flashWarning: { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderWidth: 1 },
  flashDanger: { backgroundColor: '#fee2e2', borderColor: '#fecaca', borderWidth: 1 },
  flashSuccess: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0', borderWidth: 1 },

  // --- Vault Section ---
  vaultGrid: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 40,
  },
  vaultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 20,
    justifyContent: 'space-between',
  },
  vaultBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    color: '#047857',
    borderWidth: 1,
    borderColor: '#10b981',
  },

  // --- Avatar ---
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

