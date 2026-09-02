import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';
import commentIcon from '../assets/comment.svg';

const SafeImage = ({ src, alt, className, width, height, onClick, style, id }) => {
  const [error, setError] = useState(false);
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  if (error || !src) {
    return (
      <span 
        id={id}
        className={className} 
        onClick={onClick}
        style={{ 
          ...style, 
          display: 'inline-flex', 
          alignItems: 'center', 
          fontSize: '0.9rem', 
          cursor: onClick ? 'pointer' : 'auto', 
          fontWeight: 'bold', 
          color: currentTheme === 'dark' ? '#ffffff' : '#111111' 
        }}
      >
        {alt}
      </span>
    );
  }

  return (
    <img 
      id={id}
      src={src} 
      alt={alt} 
      className={className} 
      width={width} 
      height={height} 
      onClick={onClick}
      style={style}
      onError={() => setError(true)} 
    />
  );
};

export default function Events({ currentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [replyPostId, setReplyPostId] = useState(null);
    const [replyContent, setReplyContent] = useState('');

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

    const handleLoadMore = () => {
        fetchEvents(page + 1, true);
    };

    const toggleLike = async (e, postId) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to like posts.');
            return;
        }

        const postToUpdate = posts.find(p => p.id === postId);
        if (!postToUpdate) return;
        
        const isCurrentlyLiked = Boolean(postToUpdate.user_liked);
        const newLikedState = !isCurrentlyLiked;
        
        const currentLikeCount = Number(postToUpdate.like_count) || 0;
        const optimisticCount = newLikedState ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);
        
        setPosts(prevPosts => prevPosts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    like_count: optimisticCount,
                    user_liked: newLikedState ? 1 : 0
                };
            }
            return post;
        }));

        try {
            const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
            
            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }
            
            const data = await response.json();
            
            const serverCount = data.count !== undefined ? data.count : (data.like_count !== undefined ? data.like_count : optimisticCount);
            const serverLiked = data.liked !== undefined ? data.liked : (data.user_liked !== undefined ? data.user_liked : newLikedState);

            setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        like_count: Number(serverCount),
                        user_liked: serverLiked ? 1 : 0
                    };
                }
                return post;
            }));
        } catch (err) {
            console.error('Fetch error:', err);
            setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        like_count: isCurrentlyLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1),
                        user_liked: isCurrentlyLiked ? 1 : 0
                    };
                }
                return post;
            }));
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
            alert('Please log in to reply or comment on posts.');
            return;
        }
        setReplyPostId(replyPostId === postId ? null : postId);
    };

    const submitReply = async (parentPostId) => {
        if (!replyContent.trim()) return;

        const formData = new FormData();
        formData.append('content', replyContent);
        formData.append('reply_to', parentPostId);

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
                    p.id === parentPostId
                        ? { ...p, comment_count: (Number(p.comment_count) || 0) + 1 }
                        : p
                ));
            }
        } catch (err) {
            console.error('Error submitting reply:', err);
        }
    };

    const rsvpBtnStyle = (active, activeColor) => ({
        padding: '0.4rem 0.9rem',
        borderRadius: 'var(--radius)',
        border: `1px solid ${active ? activeColor : 'var(--border-color)'}`,
        background: active ? `${activeColor}22` : 'transparent',
        color: active ? activeColor : 'inherit',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
    });

    return (
        <div>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#ccff00' }}>Upcoming STEM & Robotics Events</h2>
                </div>

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
                                    <Link to={`/profile/${post.username}`} className="username" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                                        @{post.username} 
                                    </Link>
                                    <small style={{ color: 'gray' }}>
                                        <Link to={`/posts/${post.id}`} style={{ color: 'gray', textDecoration: 'none' }}>
                                            {post.created_at} ↗ 
                                        </Link>
                                    </small>
                                </div>

                                {post.event_type && (
                                    <div className="force-dark-text" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '10px', marginBottom: '10px' }}>
                                        <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>
                                            {post.event_type} 
                                        </div>
                                        <div style={{ fontSize: '0.9rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <span><strong>Time:</strong> {post.event_time}</span>
                                            <span><strong>Location:</strong> {post.event_location}</span>
                                        </div>
                                    </div>
                                )}

                                <p style={{ marginTop: '10px', marginBottom: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{post.content}</p>

                                {post.media_path && (
                                    <div style={{ marginBottom: '0.75rem', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: '350px' }}>
                                        {post.media_path.match(/\.(mp4|webm)$/i) ? (
                                            <video controls style={{ width: '100%', maxHeight: '350px', objectFit: 'cover' }}>
                                                <source src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`} type="video/mp4" />
                                            </video>
                                        ) : (
                                            <img 
                                                src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`} 
                                                alt="Event media" 
                                                style={{ width: '100%', maxHeight: '350px', objectFit: 'cover' }} 
                                            />
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleRsvp(post.id, 'going')}
                                        style={rsvpBtnStyle(post.user_rsvp_status === 'going', '#22c55e')}
                                    >
                                        Going {post.going_count > 0 ? `(${post.going_count})` : ''}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRsvp(post.id, 'interested')}
                                        style={rsvpBtnStyle(post.user_rsvp_status === 'interested', '#3b82f6')}
                                    >
                                        Interested {post.interested_count > 0 ? `(${post.interested_count})` : ''}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={(e) => toggleLike(e, post.id)}
                                        className="post-action-btn"
                                    >
                                        <SafeImage
                                            id={`like-icon-${post.id}`}
                                            src={post.user_liked ? likedIcon : likeIcon}
                                            alt={post.user_liked ? 'Liked' : 'Like'}
                                            width="16"
                                            height="16"
                                            className={post.user_liked ? 'like-pop' : ''}
                                        />
                                        <span>{Number(post.like_count) > 0 ? Number(post.like_count) : 'Like'}</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleCommentClick(post.id)}
                                        className="post-action-btn"
                                    >
                                        <SafeImage src={commentIcon} alt="Reply" width="20" height="20" />
                                        <span>{Number(post.comment_count) > 0 ? Number(post.comment_count) : 'Reply'}</span>
                                    </button>
                                </div>

                                {replyPostId === post.id && (
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                        <textarea
                                            placeholder={`Write a reply to @${post.username}...`}
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            style={{ marginBottom: '0.5rem', width: '100%' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => submitReply(post.id)}
                                            className="btn btn-primary"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                        >
                                            Send Reply
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {hasMore && (
                            <button
                                onClick={handleLoadMore}
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