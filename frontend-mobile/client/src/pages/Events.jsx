import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
 
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';
import RsvpButtons from '../components/RsvpButtons';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';
import commentIcon from '../assets/comment.svg';

const SafeIcon = ({ src, alt, style }) => {
    const [error, setError] = useState(false);
    if (error) return <Text style={{ fontSize: '0.85rem' }}>{alt}</Text>;
    return <img src={src} alt={alt} style={style} onError={() => setError(true)} />;
};

export default function Events({ currentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [replyPostId, setReplyPostId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchEvents = async (pageNum = 1, append = false) => {
        if (append) setLoadingMore(true); else setLoading(true);
        try {
            const res = await fetch(`/api/events?page=${pageNum}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch events');
            const data = await res.json();
            const newEvents = data.events || (Array.isArray(data) ? data : []);
            setPosts((prev) => (append ? [...prev, ...newEvents] : newEvents));
            setHasMore(Boolean(data.has_more));
            setPage(pageNum);
        } catch (err) {
            console.error('Error fetching events:', err);
            if (!append) setPosts([]);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchEvents(1, false);
    }, []);

    const toggleLike = async (postId) => {
        if (!currentUser) {
            alert('Please log in to like posts.');
            return;
        }

        const postToUpdate = posts.find((p) => p.id === postId);
        if (!postToUpdate) return;

        const isCurrentlyLiked = Boolean(postToUpdate.user_liked);
        const currentLikeCount = Number(postToUpdate.like_count) || 0;
        const optimisticCount = isCurrentlyLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount + 1;

        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: optimisticCount, user_liked: isCurrentlyLiked ? 0 : 1 } : p));

        try {
            const res = await fetch(`/api/posts/${postId}/like`, { credentials: 'include',
method: 'POST', credentials: 'include' });
            if (!res.ok) throw new Error('Failed to toggle like');
        } catch (err) {
            console.error('Fetch error:', err);
            setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, like_count: currentLikeCount, user_liked: isCurrentlyLiked ? 1 : 0 } : p));
        }
    };

    const handleRsvp = async (postId, status) => {
        if (!currentUser) {
            alert('Please log in to RSVP.');
            return;
        }
        try {
            const res = await fetch(`/api/events/${postId}/rsvp`, {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                const data = await res.json();
                setPosts((prev) => prev.map((post) =>
                    post.id === postId
                        ? { ...post, user_rsvp_status: data.user_status, going_count: data.going_count, interested_count: data.interested_count }
                        : post
                ));
            }
        } catch (err) {
            console.error('RSVP error:', err);
        }
    };

    const handleCommentClick = (postId) => {
        if (!currentUser) {
            alert('Please log in to reply.');
            return;
        }
        setReplyPostId(replyPostId === postId ? null : postId);
        setReplyContent('');
    };

    const submitReply = async (e, parentPostId) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('content', replyContent);
        // Appending both variants to ensure compatibility with your backend model
        formData.append('reply_to', parentPostId); 
        formData.append('parent_id', parentPostId);

        try {
            const res = await fetch('https://stemnet.app/api/posts/create', {
                credentials: 'include',
method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (res.ok) {
                setReplyContent('');
                setReplyPostId(null);
                setPosts((prev) => prev.map((p) =>
                    p.id === parentPostId ? { ...p, comment_count: (Number(p.comment_count) || 0) + 1 } : p
                ));
            }
        } catch (err) {
            console.error('Error submitting reply:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const actionBtnStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: 'inherit',
        fontSize: 'inherit',
    };

    const mediaUrl = (post) => {
        const raw = post.media_path;
        if (!raw) return '';
        return raw.startsWith('http') ? raw : `/static/${raw}`;
    };

    return (
        <View>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                <Text style={{ color: '#ccff00', marginBottom: '1.5rem' }}>Upcoming STEM & Robotics Events</Text>

                {loading ? (
                    <View className="card" style={{ textAlign: 'center', padding: '3rem', color: '#ccff00' }}>Loading events...</View>
                ) : posts.length === 0 ? (
                    <View className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                        <Text style={{ color: '#64748b' }}>No upcoming robotics events or competitions posted yet.</Text>
                    </View>
                ) : (
                    <>
                        {posts.map((post) => (
                            <View key={post.id} className="post-card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.25rem' }}>
                                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                                        @{post.username}
                                    </Link>
                                    <small style={{ color: 'gray' }}>
                                        <Link to={`/posts/${post.id}`} style={{ color: 'gray', textDecoration: 'none' }}>
                                            {post.created_at} ↗
                                        </Link>
                                    </small>
                                </View>

                                    {post.event_type && (
                                        <View className="force-dark-text" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '10px', marginBottom: '10px' }}>
                                            <View style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{post.event_type}</View>
                                            <View style={{ fontSize: '0.9rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                <Text>
                                                    <strong>Time:</strong> {post.event_time}
                                                </Text>
                                                <Text>
                                                    <strong>Location:</strong> {post.event_location}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                <Text style={{ marginTop: '10px', marginBottom: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{post.content}</Text>

                                <PostMedia src={mediaUrl(post)} maxHeight={400} />

                                <View style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                    <TouchableOpacity type="button" onPress={() => toggleLike(post.id)} style={actionBtnStyle}>
                                        <SafeIcon src={post.user_liked ? likedIcon : likeIcon} alt={post.user_liked ? 'Liked' : 'Like'} style={{ width: '18px', height: '18px' }} />
                                        <Text>{Number(post.like_count) > 0 ? post.like_count : 'Like'}</Text>
                                    </TouchableOpacity>

                                    <RsvpButtons
                                        goingCount={Number(post.going_count) || 0}
                                        interestedCount={Number(post.interested_count) || 0}
                                        userStatus={post.user_rsvp_status}
                                        onRsvp={(status) => handleRsvp(post.id, status)}
                                    />

                                    <TouchableOpacity type="button" onPress={() => handleCommentClick(post.id)} style={actionBtnStyle}>
                                        <SafeIcon src={commentIcon} alt="Reply" style={{ width: '18px', height: '18px' }} />
                                        <Text>{Number(post.comment_count) > 0 ? post.comment_count : 'Reply'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {replyPostId === post.id && (
                                    <ReplyComposer
                                        value={replyContent}
                                        onChange={setReplyContent}
                                        onSubmit={(e) => submitReply(e, post.id)}
                                        onCancel={() => setReplyPostId(null)}
                                        submitting={submitting}
                                        theme={theme}
                                        placeholder={`Reply to @${post.username}...`}
                                    />
                                )}
                            </View>
                        ))}

                        {hasMore && (
                            <TouchableOpacity
                                onPress={() => fetchEvents(page + 1, true)}
                                disabled={loadingMore}
                                className="btn btn-primary"
                                style={{ display: 'block', margin: '1rem auto', padding: '0.6rem 1.5rem' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </TouchableOpacity>
                        )}
                    </>
                )}
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

