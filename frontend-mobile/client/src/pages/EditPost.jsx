import { View, Text, StyleSheet, Dimensions } from 'react-native';
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

function EditPost({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
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
        credentials: 'include',
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
    return <View className="card" style={{ textAlign: 'center', padding: '2rem' }}>Loading post editor...</View>;
  }

  return (
    <>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
      <main className="app-main-container">
        <View className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Text>Edit Post</Text>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            
            {/* Category Selection */}
            <View className="form-group">
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
            </View>

            {/* Event Specific Fields (Conditional) */}
            {category === 'Events' && (
              <View id="event-fields-container" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', margin: '1rem 0' }}>
                <View className="form-group">
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
                </View>

                <View className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="event_time">Event Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    id="event_time" 
                    value={eventTime} 
                    onChange={(e) => setEventTime(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                  />
                </View>

                <View className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label htmlFor="event_location">Location / Link *</label>
                  <input 
                    type="text" 
                    id="event_location" 
                    value={eventLocation} 
                    onChange={(e) => setEventLocation(e.target.value)} 
                    placeholder="Physical address or online link"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                  />
                </View>
              </View>
            )}

            {/* GitHub Link Field (Conditional) */}
            {category !== 'Events' && (
              <View className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="github_link">GitHub Repository (Optional)</label>
                <input 
                  type="url" 
                  id="github_link" 
                  value={githubLink} 
                  onChange={(e) => setGithubLink(e.target.value)} 
                  placeholder="https://github.com/your-team/repo"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}
                />
              </View>
            )}

            {/* Content Area */}
            <View className="form-group" style={{ marginTop: '1rem' }}>
              <label htmlFor="content">Content *</label>
              <textarea 
                id="content" 
                rows="5" 
                value={content} 
                onChange={(e) => setContent(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </View>

            {/* Image Preview & Upload Area */}
            <View className="form-group" style={{ marginTop: '1rem' }}>
              <label>Post Image</label>
              
              {existingImage && !newImageFile && (
                <View style={imagePreviewBoxStyle}>
                  <Text style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Current Image:</Text>
                  <img 
                    src={existingImage} 
                    alt="Current post attachment" 
                    style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '4px' }} 
                  />
                </View>
              )}

              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setNewImageFile(e.target.files[0])}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', background: 'var(--bg-color)' }}
              />
              <Text style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                Upload a new image to replace the current one, or leave blank to keep it.
              </Text>
            </View>

            <View style={{ display: 'flex', gap: '1rem', margin: '1.5rem 0 0 0' }}>
              <TouchableOpacity type="submit" className="btn btn-primary" style={{ flex: 1 }}>Update Post</TouchableOpacity>
              <TouchableOpacity 
                type="button" 
                onPress={() => navigate(-1)} 
                className="btn btn-outline" 
                style={cancelBtnStyle}
              >
                Cancel
              </TouchableOpacity>
            </View>
          </form>
        </View>
      </main>
    </>
  );
}

export default EditPost;



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

