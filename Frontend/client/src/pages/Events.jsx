import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';
import commentIcon from '../assets/comment.svg';

// Custom Image Component: Handles missing images safely and accepts all props (like id)
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

export default function Events({ currentUser, theme, toggleTheme }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyPostId, setReplyPostId] = useState(null);
    const [replyContent, setReplyContent] = useState('');

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch events');
            const data = await res.json();
            if (Array.isArray(data)) {
                setPosts(data);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Error fetching events:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

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
        
        // Safely parse the count as a Number to prevent "1" + 1 = "11" string glitches
        const currentLikeCount = Number(postToUpdate.like_count) || 0;
        
        // 1. Optimistic UI Update
        setPosts(prevPosts => prevPosts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    like_count: newLikedState ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1),
                    user_liked: newLikedState ? 1 : 0
                };
            }
            return post;
        }));

        // 2. Network Request
        try {
            const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
            
            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }
            
            const data = await response.json();
            
            // 3. Sync with exact truth
            setPosts(prevPosts => prevPosts.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        like_count: Number(data.count),
                        user_liked: data.liked ? 1 : 0
                    };
                }
                return post;
            }));
        } catch (err) {
            console.error('Fetch error:', err);
            // 4. Revert optimistic update on failure
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
                fetchEvents();
            }
        } catch (err) {
            console.error('Error submitting reply:', err);
        }
    };

    return (
        <div>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
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
                    posts.map((post) => (
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

                            {/* Event Details Badge Header */}
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

                            {/* Content */}
                            <p style={{ marginTop: '10px', marginBottom: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{post.content}</p>

                            {/* Media Attachment */}
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

                            {/* Action Bar */}
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
                                    <span>{Number(post.like_count) > 0 ? post.like_count : 'Like'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleCommentClick(post.id)}
                                    className="post-action-btn"
                                >
                                    <SafeImage src={commentIcon} alt="Reply" width="20" height="20" />
                                    <span>Reply</span>
                                </button>
                            </div>

                            {/* Inline Reply Box */}
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
                    ))
                )}
            </main>
        </div>
    );
}