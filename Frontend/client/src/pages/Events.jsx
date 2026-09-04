import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';
import RsvpButtons from '../components/RsvpButtons';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';
import commentIcon from '../assets/comment.svg';

const SafeIcon = ({ src, alt, style }) => {
    const [error, setError] = useState(false);
    if (error) return <span style={{ fontSize: '0.85rem' }}>{alt}</span>;
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
            const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
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
                method: 'POST',
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
            const res = await fetch('/api/posts/create', {
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
        <div>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                <h2 style={{ color: '#ccff00', marginBottom: '1.5rem' }}>Upcoming STEM & Robotics Events</h2>

                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#ccff00' }}>Loading events...</div>
                ) : posts.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                        <p style={{ color: '#64748b' }}>No upcoming robotics events or competitions posted yet.</p>
                    </div>
                ) : (
                    <>
                        {posts.map((post) => (
                            <div key={post.id} className="post-card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                                        @{post.username}
                                    </Link>
                                    <small style={{ color: 'gray' }}>
                                        <Link to={`/posts/${post.id}`} style={{ color: 'gray', textDecoration: 'none' }}>
                                            {post.created_at} ↗
                                        </Link>
                                    </small>
                                </div>

                                {post.event_type && (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '10px', marginBottom: '10px', color: '#000000' }}>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px', color: '#000000' }}>{post.event_type}</div>
                                        <div style={{ fontSize: '0.9rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#000000' }}>
                                            <span style={{ color: '#000000' }}>
                                                <strong style={{ color: '#000000' }}>Time:</strong> <span style={{ color: '#000000' }}>{post.event_time}</span>
                                            </span>
                                            <span style={{ color: '#000000' }}>
                                                <strong style={{ color: '#000000' }}>Location:</strong> <span style={{ color: '#000000' }}>{post.event_location}</span>
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <p style={{ marginTop: '10px', marginBottom: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{post.content}</p>

                                <PostMedia src={mediaUrl(post)} maxHeight={400} />

                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                    <button type="button" onClick={() => toggleLike(post.id)} style={actionBtnStyle}>
                                        <SafeIcon src={post.user_liked ? likedIcon : likeIcon} alt={post.user_liked ? 'Liked' : 'Like'} style={{ width: '18px', height: '18px' }} />
                                        <span>{Number(post.like_count) > 0 ? post.like_count : 'Like'}</span>
                                    </button>

                                    <RsvpButtons
                                        goingCount={Number(post.going_count) || 0}
                                        interestedCount={Number(post.interested_count) || 0}
                                        userStatus={post.user_rsvp_status}
                                        onRsvp={(status) => handleRsvp(post.id, status)}
                                    />

                                    <button type="button" onClick={() => handleCommentClick(post.id)} style={actionBtnStyle}>
                                        <SafeIcon src={commentIcon} alt="Reply" style={{ width: '18px', height: '18px' }} />
                                        <span>{Number(post.comment_count) > 0 ? post.comment_count : 'Reply'}</span>
                                    </button>
                                </div>

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
                            </div>
                        ))}

                        {hasMore && (
                            <button
                                onClick={() => fetchEvents(page + 1, true)}
                                disabled={loadingMore}
                                className="btn btn-primary"
                                style={{ display: 'block', margin: '1rem auto', padding: '0.6rem 1.5rem' }}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}