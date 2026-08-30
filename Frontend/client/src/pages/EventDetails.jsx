import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

export const LikeIcon = ({ width = 18, height = 18, className = '', style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ color: 'inherit', ...style }}
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const LikedIcon = ({ width = 18, height = 18, className = '', style = {}, theme = 'light' }) => {
  const iconColor = theme === 'dark' ? '#ffffff' : '#000000';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={iconColor}
      stroke={iconColor}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
};

export const ReplyIcon = ({ width = 18, height = 18, className = '', style = {} }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ color: 'inherit', ...style }}
  >
    <path d="M23 18a2 2 0 0 1-2 2H6l-4 3V3a2 2 0 0 1 2-2h17a2 2 0 0 1 2 2z" />
    <path d="M9.5 8l-3 3 3 3" />
    <path d="M15.5 8l3 3-3 3" />
  </svg>
);

const SafeImage = ({ src, alt, className, width, height, onClick, style, id }) => {
  const [error, setError] = useState(false);
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  const filterStyle = currentTheme === 'dark'
    ? 'invert(100%) sepia(0%) saturate(7500%) hue-rotate(180deg) brightness(100%) contrast(100%)'
    : '';

  const combinedStyle = { ...style, filter: filterStyle };

  if (error || !src) {
    return (
      <span
        id={id}
        className={className}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '0.9rem',
          cursor: onClick ? 'pointer' : 'auto',
          fontWeight: 'bold',
          color: currentTheme === 'dark' ? '#ffffff' : '#111111',
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
      style={combinedStyle}
      onError={() => setError(true)}
    />
  );
};

const buildCommentTree = (rawComments, mainPostId) => {
  if (!Array.isArray(rawComments)) return [];

  const commentMap = {};
  const rootComments = [];
  const normalizedMainId = String(mainPostId);

  rawComments.forEach(comment => {
    const commentId = String(comment.id);
    commentMap[commentId] = { ...comment, id: commentId, replies: [] };
  });

  rawComments.forEach(comment => {
    const commentId = String(comment.id);
    const parentRaw = comment.reply_to ?? comment.parent_id;
    const parentId = parentRaw ? String(parentRaw) : null;

    const isTopLevel = !parentId || parentId === normalizedMainId;

    if (isTopLevel) {
      rootComments.push(commentMap[commentId]);
    } else if (commentMap[parentId]) {
      commentMap[parentId].replies.push(commentMap[commentId]);
    } else {
      rootComments.push(commentMap[commentId]);
    }
  });

  return rootComments;
};

const renderTextWithLinks = (text) => {
  return text;
};

export default function EventDetails({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
  const params = useParams();
  const postId = params.postId || params.id;
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentContent, setCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDarkMode = theme === 'dark';
  const dynamicTextColor = isDarkMode ? '#ffffff' : '#111111';

  const fetchPostDetails = useCallback(async () => {
    if (!postId) {
      setError('Invalid Event ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/posts/${postId}`, { credentials: 'include' });

      if (res.status === 429) {
        throw new Error('Rate limit reached. Please wait a few seconds and refresh.');
      }
      if (!res.ok) throw new Error('Post not found');

      const data = await res.json();
      const fetchedPost = data.post || data;
      const fetchedComments = data.comments || data.post?.comments || data.replies || [];

      setPost(fetchedPost);
      setComments(buildCommentTree(fetchedComments, postId));
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  const toggleLike = async () => {
    if (!currentUser) {
      alert('Please log in to like posts.');
      return;
    }

    if (!post) return;

    const isCurrentlyLiked = Boolean(post.user_liked);
    const newLikedState = !isCurrentlyLiked;
    const currentLikeCount = Number(post.like_count) || 0;
    const optimisticCount = newLikedState ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);

    setPost(prev => ({
      ...prev,
      like_count: optimisticCount,
      user_liked: newLikedState ? 1 : 0
    }));

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to toggle like');

      const data = await response.json();
      const serverCount = data.count ?? data.like_count ?? optimisticCount;
      const serverLiked = data.liked ?? data.user_liked ?? newLikedState;

      setPost(prev => ({
        ...prev,
        like_count: Number(serverCount),
        user_liked: serverLiked ? 1 : 0
      }));
    } catch (err) {
      console.error('Fetch error:', err);
      setPost(prev => ({
        ...prev,
        like_count: currentLikeCount,
        user_liked: isCurrentlyLiked ? 1 : 0
      }));
    }
  };

  const toggleCommentLike = async (commentId) => {
    if (!currentUser) {
      alert('Please log in to like comments.');
      return;
    }

    const updateTargetComment = (nodeList) => {
      return nodeList.map(item => {
        if (String(item.id) === String(commentId)) {
          const currentlyLiked = Boolean(item.user_liked);
          const count = Number(item.like_count) || 0;
          return {
            ...item,
            user_liked: !currentlyLiked ? 1 : 0,
            like_count: !currentlyLiked ? count + 1 : Math.max(0, count - 1)
          };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateTargetComment(item.replies) };
        }
        return item;
      });
    };

    setComments(prevComments => updateTargetComment(prevComments));

    try {
      const response = await fetch(`/api/posts/${commentId}/like`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to toggle comment like');
    } catch (err) {
      console.error('Error liking comment:', err);
      fetchPostDetails();
    }
  };

  const handleCreateComment = async (e, parentId = null) => {
    if (e) e.preventDefault();

    if (!currentUser) {
      alert('Please log in to reply.');
      return;
    }

    const textToSend = parentId ? replyContent : commentContent;
    if (!textToSend.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', textToSend.trim());
    formData.append('reply_to', parentId || postId);

    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (res.ok) {
        if (parentId) {
          setReplyContent('');
          setReplyToId(null);
        } else {
          setCommentContent('');
        }
        await fetchPostDetails();
      } else {
        alert('Failed to post reply.');
      }
    } catch (err) {
      console.error('Error posting reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderCommentItem = (comment) => (
    <div
      key={comment.id}
      className="card"
      style={{
        padding: '1rem',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        marginBottom: '0.75rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <Link
          to={`/profile/${comment.username}`}
          style={{
            fontWeight: 'bold',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
          }}
        >
          @{comment.username}
        </Link>
        <small style={{ color: 'gray' }}>{comment.created_at}</small>
      </div>

      <p style={{
        margin: 0,
        whiteSpace: 'pre-line',
        wordBreak: 'break-word',
        fontSize: '0.9rem',
        marginBottom: '0.5rem',
        color: 'var(--text-primary)',
      }}>
        {renderTextWithLinks(comment.content)}
      </p>

      <div style={{
        display: 'flex',
        gap: '1.25rem',
        alignItems: 'center',
        marginTop: '0.5rem',
      }}>
        <button
          type="button"
          onClick={() => toggleCommentLike(comment.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: 0,
            color: 'var(--text-primary)',
          }}
        >
          {comment.user_liked ? (
            <LikedIcon width="16" height="16" theme={theme} />
          ) : (
            <LikeIcon width="16" height="16" />
          )}
          <span style={{ fontSize: '0.85rem' }}>
            {Number(comment.like_count) > 0 ? comment.like_count : 'Like'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
          title="Reply"
          aria-label="Reply"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0,
            color: 'var(--text-primary)',
          }}
        >
          <ReplyIcon width="16" height="16" />
        </button>
      </div>

      {replyToId === comment.id && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <form
            onSubmit={(e) => handleCreateComment(e, comment.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <textarea
              placeholder={`Reply to @${comment.username}...`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '0.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setReplyToId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'gray',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                className="btn btn-primary"
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.85rem',
                }}
              >
                {submitting ? 'Sending...' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
          {comment.replies.map((reply) => renderCommentItem(reply))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
      <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: theme === 'dark' ? '#ccff00' : '#000000',
            cursor: 'pointer',
            marginBottom: '1rem',
            fontWeight: 'bold',
          }}
        >
          ← Back to Events
        </button>

        {loading ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--primary-color, #ccff00)',
            }}
          >
            Loading event details...
          </div>
        ) : error || !post ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
            }}
          >
            <p style={{ color: '#64748b' }}>{error || 'Event not found.'}</p>
          </div>
        ) : (
          <>
            <div
              className="post-card"
              style={{
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  to={`/profile/${post.username}`}
                  className="username"
                  style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}
                >
                  @{post.username}
                </Link>
                <small style={{ color: 'gray' }}>{post.created_at}</small>
              </div>

              {post.event_type && (
                <div
                  className="force-dark-text"
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius)',
                    marginTop: '10px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '4px' }}>{post.event_type}</div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      display: 'flex',
                      gap: '1.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      <strong>Time:</strong> {post.event_time}
                    </span>
                    <span>
                      <strong>Location:</strong> {post.event_location}
                    </span>
                  </div>
                </div>
              )}

              <p
                style={{
                  marginTop: '10px',
                  marginBottom: '1rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-line',
                  fontSize: '1.05rem',
                }}
              >
                {post.content}
              </p>

              {post.media_path && (
                <div
                  style={{
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    maxHeight: '450px',
                  }}
                >
                  {post.media_path.match(/\.(mp4|webm)$/i) ? (
                    <video controls style={{ width: '100%', maxHeight: '450px', objectFit: 'cover' }}>
                      <source
                        src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`}
                        type="video/mp4"
                      />
                    </video>
                  ) : (
                    <SafeImage
                      src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`}
                      alt="Event media"
                      style={{ width: '100%', maxHeight: '450px', objectFit: 'cover' }}
                    />
                  )}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={toggleLike}
                  className="post-action-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: dynamicTextColor,
                  }}
                >
                  {post.user_liked ? (
                    <LikedIcon width="18" height="18" theme={theme} />
                  ) : (
                    <LikeIcon width="18" height="18" />
                  )}
                  <span>
                    {Number(post.like_count) > 0 ? Number(post.like_count) : 'Like'}
                  </span>
                </button>
              </div>
            </div>

            <div
              style={{
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Discussion</h3>
              <form
                onSubmit={(e) => handleCreateComment(e, null)}
                style={{ marginBottom: '0' }}
              >
                <textarea
                  placeholder={currentUser ? 'Write a reply...' : 'Log in to leave a reply...'}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  disabled={!currentUser || submitting}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    marginBottom: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={!currentUser || !commentContent.trim() || submitting}
                    className="btn btn-primary"
                    style={{
                      padding: '0.5rem 1rem',
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontWeight: 'bold',
                    }}
                  >
                    <ReplyIcon width="16" height="16" />
                    <span>{submitting ? 'Posting...' : 'Post Reply'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="comments-section">
              {comments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', margin: '2rem 0' }}>
                  No replies yet. Be the first to reply!
                </p>
              ) : (
                comments.map((comment) => renderCommentItem(comment))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}