import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';

const globAssets = import.meta.glob('../assets/*', { eager: true, import: 'default' });

const getAssetUrl = (filename) => {
    const keys = Object.keys(globAssets);
    const found = keys.find((key) => key.toLowerCase().endsWith(filename.toLowerCase()));
    return found ? globAssets[found] : '';
};

const commentIcon = getAssetUrl('comment.svg');
const unlikedIcon = getAssetUrl('like.svg');
const likedIcon = getAssetUrl('liked.svg') || unlikedIcon;

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
    const raw = item.media_path ||
                item.image_url ||
                item.image ||
                item.media_url ||
                item.media ||
                item.photo_url ||
                item.photo ||
                item.file_path ||
                item.attachment;

    return resolveImageUrl(raw);
};

const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary-color)', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

const SafeImage = ({ src, alt, className, style, onClick }) => {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <View
                className={className}
                onPress={onClick}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--border-color)',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    userSelect: 'none',
                    ...style
                }}
            >
                {alt ? alt[0].toUpperCase() : 'U'}
            </View>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onPress={onClick}
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                ...style
            }}
            onError={() => setError(true)}
        />
    );
};

export default function Home({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const fetchPosts = async (pageNum = 1, append = false) => {
        if (append) setLoadingMore(true); else setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/posts?page=${pageNum}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const newPosts = data.posts || (Array.isArray(data) ? data : []);
                setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
                setHasMore(Boolean(data.has_more));
                setPage(pageNum);
            } else {
                setError('Failed to load posts.');
            }
        } catch (err) {
            console.error('Error fetching home feed:', err);
            setError('Failed to load feed.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPosts(1, false);
    }, []);

    const handleLoadMore = () => {
        fetchPosts(page + 1, true);
    };

    const handleLikePost = async (postId) => {
        if (!currentUser) return navigate('/login');

        setPosts((prevPosts) =>
            prevPosts.map((post) => {
                if (post.id === postId) {
                    const wasLiked = Boolean(post.user_liked);
                    const currentCount = Number(post.like_count) || 0;
                    return {
                        ...post,
                        user_liked: wasLiked ? 0 : 1,
                        like_count: wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
                    };
                }
                return post;
            })
        );

        try {
            await fetch(`/api/posts/${postId}/like`, {
                credentials: 'include',
method: 'POST',
                credentials: 'include',
headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId }),
            });
        } catch (err) {
            console.error('Like toggle error:', err);
        }
    };

    const handleAddComment = async (e, postId) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');

        const text = (commentInputs[postId] || '').trim();
        if (!text) return;

        setSubmitting(true);
        const formData = new FormData();
        formData.append('content', text);
        formData.append('reply_to', postId);

        try {
            const res = await fetch('https://stemnet.app/api/posts/create', {
                credentials: 'include',
method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (res.ok) {
                setPosts((prevPosts) =>
                    prevPosts.map((p) =>
                        p.id === postId
                            ? { ...p, comment_count: (Number(p.comment_count) || 0) + 1 }
                            : p
                    )
                );
                setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
                setActiveCommentPostId(null);
            }
        } catch (err) {
            console.error('Error submitting comment:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelReply = (postId) => {
        setActiveCommentPostId(null);
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    };

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                {!currentUser && (
                    <View className="card" style={{
                        marginBottom: '1.5rem',
                        padding: '1.5rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                    }}>
                        <Text style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-color)' }}>
                            Welcome to STEMNet Greece
                        </Text>
                        <Text style={{ margin: 0, color: 'var(--text-color)', lineHeight: '1.5', fontSize: '0.95rem' }}>
                            STEMNet is an open platform centered around Greek high school robotics clubs and STEM students. Connect with other teams, share your open-source code, showcase your 3D printing files, and ask technical troubleshooting questions.
                        </Text>
                    </View>
                )}

                {loading && (
                    <View className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        Loading feed...
                    </View>
                )}

                {error && (
                    <View className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#ef4444' }}>
                        {error}
                    </View>
                )}

                {!loading && posts.length === 0 && !error && (
                    <View className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No posts available yet.
                    </View>
                )}

                {!loading && posts.length > 0 && (
                    <View style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {posts.map((post) => {
                        const postImage = getPostImage(post);
                        const userLiked = Boolean(post.user_liked);
                        const totalLikes = Number(post.like_count) || 0;
                        const commentCount = Number(post.comment_count) || 0;
                        const postDate = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'Recently';

                        const authorName = post.username || 'user';
                        const authorPic = resolveImageUrl(post.profile_pic);
                        const isReplying = activeCommentPostId === post.id;

                        return (
                            <View key={post.id} className="card" style={{
                                padding: '1.25rem',
                                backgroundColor: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px'
                            }}>
                                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Link 
                                            to={`/profile/${authorName}`} 
                                            style={{ 
                                                display: 'inline-block',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                overflow: 'hidden',
                                                flexShrink: 0
                                            }}
                                        >
                                            <SafeImage
                                                src={authorPic}
                                                alt={authorName}
                                            />
                                        </Link>
                                        <Link to={`/profile/${authorName}`} style={{ color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' }}>
                                            @{authorName}
                                        </Link>
                                    </View>                                  
                                    <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {post.category && (
                                            <Text 
                                                className="force-dark-text" 
                                                style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.15rem 0.6rem',
                                                    backgroundColor: 'var(--primary-color)',
                                                    color: '#000000',
                                                    border: theme === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
                                                    borderRadius: '12px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                {post.category}
                                            </Text>
                                        )}
                                        <Text style={{ fontSize: '0.8rem', color: '#64748b' }}>{postDate}</Text>
                                        <Link to={`/post/${post.id}`} title="View thread" style={{ textDecoration: 'none', color: '#64748b', fontSize: '1.1rem' }}>
                                            →
                                        </Link>
                                    </View>
                                </View>

                                {post.parent_content && (
                                    <View style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '0.75rem',
                                        marginTop: '0.5rem',
                                        marginBottom: '1rem',
                                        backgroundColor: 'rgba(0,0,0,0.02)'
                                    }}>
                                        <View style={{ fontSize: '0.85rem', color: theme === 'dark' ? '#ccff00' : '#000000', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                                            @{post.parent_username}
                                        </View>
                                        <View style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', wordBreak: 'break-word', color: 'var(--text-color)' }}>
                                            {renderTextWithLinks(post.parent_content)}
                                        </View>
                                    </View>
                                )}

                                {post.content && (
                                    <Text style={{ margin: '0 0 0.75rem 0', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                        {renderTextWithLinks(post.content)}
                                    </Text>
                                )}

                                <PostMedia src={postImage} maxHeight={500} />

                                <View style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                    <TouchableOpacity
                                        onPress={() => handleLikePost(post.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            color: 'inherit',
                                            fontSize: 'inherit',
                                        }}
                                    >
                                        <img
                                            src={userLiked ? likedIcon : unlikedIcon}
                                            alt={userLiked ? 'Liked' : 'Unliked'}
                                            style={{ width: '18px', height: '18px', filter: 'var(--icon-filter)' }}
                                        />
                                        <Text>{totalLikes}</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => setActiveCommentPostId(isReplying ? null : post.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            color: isReplying ? 'var(--primary-color)' : 'inherit',
                                            fontSize: 'inherit',
                                        }}
                                    >
                                        <img
                                            src={commentIcon}
                                            alt="Reply"
                                            style={{ width: '18px', height: '18px', filter: isReplying ? 'none' : 'var(--icon-filter)' }}
                                        />
                                        <Text>{commentCount > 0 ? `${commentCount}` : 'Reply'}</Text>
                                    </TouchableOpacity>
                                </View>

                                {isReplying && (
                                    <ReplyComposer
                                        value={commentInputs[post.id] || ''}
                                        onChange={(val) => setCommentInputs({ ...commentInputs, [post.id]: val })}
                                        onSubmit={(e) => handleAddComment(e, post.id)}
                                        onCancel={() => handleCancelReply(post.id)}
                                        submitting={submitting}
                                        theme={theme}
                                        placeholder={`Reply to @${authorName}...`}
                                    />
                                )}
                            </View>
                        );
                    })}

                        {hasMore && (
                            <TouchableOpacity
                                onPress={handleLoadMore}
                                disabled={loadingMore}
                                className="btn btn-primary"
                                style={{ alignSelf: 'center', padding: '0.6rem 1.5rem', marginTop: '0.5rem' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </main>
        </>
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

