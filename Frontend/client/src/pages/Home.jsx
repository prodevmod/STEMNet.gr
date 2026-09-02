import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

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

    const width = style?.width || style?.height || '40px';
    const height = style?.height || style?.width || '40px';

    const baseCropStyle = {
        width: width,
        height: height,
        minWidth: width,
        maxWidth: width,
        minHeight: height,
        maxHeight: height,
        aspectRatio: '1 / 1',
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'inline-block'
    };

    if (error || !src) {
        return (
            <div
                className={className}
                onClick={onClick}
                style={{
                    fontWeight: 'bold',
                    fontSize: '1.25rem',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--border-color)',
                    userSelect: 'none',
                    ...baseCropStyle,
                    ...style
                }}
            >
                {alt ? alt[0].toUpperCase() : 'U'}
            </div>
        );
    }

        return (
            <img
                src={src}
                alt={alt}
                className={className}
                onClick={onClick}
                style={{
                    ...baseCropStyle,
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ post_id: postId }),
            });
        } catch (err) {
            console.error('Like toggle error:', err);
        }
    };

    const handleAddComment = async (postId, e) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');

        const text = (commentInputs[postId] || '').trim();
        if (!text) return;

        const formData = new FormData();
        formData.append('content', text);
        formData.append('reply_to', postId);

        try {
            const res = await fetch('/api/posts/create', {
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
                    <div className="card" style={{
                        marginBottom: '1.5rem',
                        padding: '1.5rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-color)' }}>
                            Welcome to STEMNet Greece
                        </h2>
                        <p style={{ margin: 0, color: 'var(--text-color)', lineHeight: '1.5', fontSize: '0.95rem' }}>
                            STEMNet is an open platform centered around Greek high school robotics clubs and STEM students. Connect with other teams, share your open-source code, showcase your 3D printing files, and ask technical troubleshooting questions.
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        Loading feed...
                    </div>
                )}

                {error && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {!loading && posts.length === 0 && !error && (
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No posts available yet.
                    </div>
                )}

                {!loading && posts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                                <div key={post.id} className="card" style={{
                                    padding: '1.25rem',
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <Link to={`/profile/${authorName}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
                                                {/* Author Picture locked to 40x40 circle */}
                                                <SafeImage
                                                    src={authorPic}
                                                    alt={authorName}
                                                    className="avatar"
                                                    style={{ 
                                                        width: '40px', 
                                                        height: '40px',
                                                        minWidth: '40px',
                                                        minHeight: '40px',
                                                        maxWidth: '40px',
                                                        maxHeight: '40px',
                                                        aspectRatio: '1 / 1',
                                                        objectFit: 'cover',
                                                        borderRadius: '50%',
                                                        flexShrink: 0
                                                    }}
                                                />
                                            </Link>
                                            <Link to={`/profile/${authorName}`} style={{ color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' }}>
                                                @{authorName}
                                            </Link>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{postDate}</span>
                                            <Link to={`/post/${post.id}`} title="View thread" style={{ textDecoration: 'none', color: '#64748b', fontSize: '1.1rem' }}>
                                                →
                                            </Link>
                                        </div>
                                    </div>

                                    {post.parent_content && (
                                        <div style={{
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            marginTop: '0.5rem',
                                            marginBottom: '1rem',
                                            backgroundColor: 'rgba(0,0,0,0.02)'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', color: theme === 'dark' ? '#ccff00' : '#000000', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                                                @{post.parent_username}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', wordBreak: 'break-word', color: 'var(--text-color)' }}>
                                                {renderTextWithLinks(post.parent_content)}
                                            </div>
                                        </div>
                                    )}

                                    {post.content && (
                                        <p style={{ margin: '0 0 0.75rem 0', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                            {renderTextWithLinks(post.content)}
                                        </p>
                                    )}

                                    {postImage && (
                                        <div style={{
                                            marginBottom: '0.75rem',
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            backgroundColor: 'rgba(0,0,0,0.02)',
                                            borderRadius: '8px',
                                            overflow: 'hidden'
                                        }}>
                                            <img
                                                src={postImage}
                                                alt="Post attachment"
                                                style={{
                                                    maxWidth: '100%',
                                                    height: 'auto',
                                                    maxHeight: '600px',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                    borderRadius: '8px'
                                                }}
                                                onError={(e) => {
                                                    e.currentTarget.parentElement.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                        <button
                                            onClick={() => handleLikePost(post.id)}
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
                                            <span>{totalLikes}</span>
                                        </button>

                                        <button
                                            onClick={() => setActiveCommentPostId(isReplying ? null : post.id)}
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
                                            <span>{commentCount > 0 ? `${commentCount}` : 'Reply'}</span>
                                        </button>
                                    </div>

                                    {isReplying && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                                            <form onSubmit={(e) => handleAddComment(post.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Write a reply..."
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.6rem 0.8rem',
                                                        fontSize: '0.9rem',
                                                        borderRadius: 'var(--radius)',
                                                        border: '1px solid var(--border-color)',
                                                        background: 'var(--card-bg)',
                                                        color: 'inherit'
                                                    }}
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCancelReply(post.id)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            fontSize: '0.85rem',
                                                            background: 'transparent',
                                                            color: 'var(--text-color)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: 'var(--radius)',
                                                            cursor: 'pointer'
                                                        }}>
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 1.2rem', fontSize: '0.85rem' }}>
                                                        Reply
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="btn btn-primary"
                                style={{ alignSelf: 'center', padding: '0.6rem 1.5rem', marginTop: '0.5rem' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}