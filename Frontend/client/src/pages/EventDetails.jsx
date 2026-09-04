import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';
import commentIcon from '../assets/comment.svg';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';

const SafeIcon = ({ src, alt, style }) => {
  const [error, setError] = useState(false);
  if (error) return <span style={{ fontSize: '0.85rem' }}>{alt}</span>;
  return <img src={src} alt={alt} style={style} onError={() => setError(true)} />;
};

const buildCommentTree = (rawComments, mainPostId) => {
  if (!Array.isArray(rawComments)) return [];

  const commentMap = {};
  const rootComments = [];
  const normalizedMainId = String(mainPostId);

  rawComments.forEach((comment) => {
    const commentId = String(comment.id);
    commentMap[commentId] = { ...comment, id: commentId, replies: [] };
  });

  rawComments.forEach((comment) => {
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

const resolveMediaUrl = (path) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `/static/${path}`;
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
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyToId, setReplyToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    const currentLikeCount = Number(post.like_count) || 0;
    const optimisticCount = !isCurrentlyLiked ? currentLikeCount + 1 : Math.max(0, currentLikeCount - 1);

    setPost((prev) => ({ ...prev, like_count: optimisticCount, user_liked: !isCurrentlyLiked ? 1 : 0 }));

    try {
      const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Failed to toggle like');
    } catch (err) {
      console.error('Fetch error:', err);
      setPost((prev) => ({ ...prev, like_count: currentLikeCount, user_liked: isCurrentlyLiked ? 1 : 0 }));
    }
  };

  const toggleCommentLike = async (commentId) => {
    if (!currentUser) {
      alert('Please log in to like comments.');
      return;
    }

    const updateTargetComment = (nodeList) => {
      return nodeList.map((item) => {
        if (String(item.id) === String(commentId)) {
          const currentlyLiked = Boolean(item.user_liked);
          const count = Number(item.like_count) || 0;
          return {
            ...item,
            user_liked: !currentlyLiked ? 1 : 0,
            like_count: !currentlyLiked ? count + 1 : Math.max(0, count - 1),
          };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateTargetComment(item.replies) };
        }
        return item;
      });
    };

    setComments((prevComments) => updateTargetComment(prevComments));

    try {
      const response = await fetch(`/api/posts/${commentId}/like`, {
        method: 'POST',
        credentials: 'include',
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
    formData.append('parent_id', parentId || postId);

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
          setShowReplyForm(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Link
          to={`/profile/${comment.username}`}
          style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          @{comment.username}
        </Link>
        <small style={{ color: 'gray' }}>{comment.created_at}</small>
      </div>

      <p style={{ margin: 0, whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {comment.content}
      </p>

      <PostMedia src={resolveMediaUrl(comment.media_path)} maxHeight={300} />

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={() => toggleCommentLike(comment.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: 'var(--text-primary)' }}
        >
          <SafeIcon src={comment.user_liked ? likedIcon : likeIcon} alt="Like" style={{ width: '16px', height: '16px' }} />
          <span style={{ fontSize: '0.85rem' }}>
            {Number(comment.like_count) > 0 ? comment.like_count : 'Like'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
          title="Reply"
          aria-label="Reply"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          <SafeIcon src={commentIcon} alt="Reply" style={{ width: '16px', height: '16px' }} />
          <span>Reply</span>
        </button>
      </div>

      {replyToId === comment.id && (
        <ReplyComposer
          value={replyContent}
          onChange={setReplyContent}
          onSubmit={(e) => handleCreateComment(e, comment.id)}
          onCancel={() => setReplyToId(null)}
          submitting={submitting}
          theme={theme}
          placeholder={`Reply to @${comment.username}...`}
        />
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
          className="back-nav-btn"
          onClick={() => navigate(-1)}
        >
          ← Back to Events
        </button>

        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary-color, #ccff00)' }}>
            Loading event details...
          </div>
        ) : error || !post ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
            <p style={{ color: '#64748b' }}>{error || 'Event not found.'}</p>
          </div>
        ) : (
          <>
            <div className="post-card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                  @{post.username}
                </Link>
                <small style={{ color: 'gray' }}>{post.created_at}</small>
              </div>

              {post.event_type && (
                <div className="force-dark-text" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '10px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '4px' }}>{post.event_type}</div>
                  <div style={{ fontSize: '0.95rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <span>
                      <strong>Time:</strong> {post.event_time}
                    </span>
                    <span>
                      <strong>Location:</strong> {post.event_location}
                    </span>
                  </div>
                </div>
              )}

              <p style={{ marginTop: '10px', marginBottom: '1rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', fontSize: '1.05rem' }}>
                {post.content}
              </p>

              <PostMedia src={resolveMediaUrl(post.media_path)} maxHeight={450} />

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={toggleLike}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit' }}
                >
                  <SafeIcon src={post.user_liked ? likedIcon : likeIcon} alt="Like" style={{ width: '18px', height: '18px' }} />
                  <span>{Number(post.like_count) > 0 ? Number(post.like_count) : 'Like'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReplyForm((prev) => !prev)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit' }}
                >
                  <SafeIcon src={commentIcon} alt="Reply" style={{ width: '18px', height: '18px' }} />
                  <span>{Number(post.comment_count) > 0 ? Number(post.comment_count) : 'Reply'}</span>
                </button>
              </div>
            </div>

            {showReplyForm && (
              <div style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Discussion</h3>
                <ReplyComposer
                  value={commentContent}
                  onChange={setCommentContent}
                  onSubmit={(e) => handleCreateComment(e, null)}
                  onCancel={() => setShowReplyForm(false)}
                  submitting={submitting}
                  theme={theme}
                  placeholder={currentUser ? 'Write a reply...' : 'Log in to leave a reply...'}
                />
              </div>
            )}

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