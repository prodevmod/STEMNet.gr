import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
  if (error) return <Text style={{ fontSize: '0.85rem' }}>{alt}</Text>;
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
      const response = await fetch(`/api/posts/${postId}/like`, { credentials: 'include',
method: 'POST', credentials: 'include' });
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
        credentials: 'include',
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
      const res = await fetch('https://stemnet.app/api/posts/create', {
        credentials: 'include',
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

  // ADDED: Delete handler for the main event post
  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/delete`, {
        credentials: 'include',
method: 'DELETE', 
        credentials: 'include'
      });
      
      if (res.ok) {
        navigate('/'); // Redirect to events/home feed after deletion
      } else {
        alert('Failed to delete the event. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('An error occurred while deleting the event.');
    }
  };

  const renderCommentItem = (comment) => (
    <View
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
      <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Link
          to={`/profile/${comment.username}`}
          style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          @{comment.username}
        </Link>
        <small style={{ color: 'gray' }}>{comment.created_at}</small>
      </View>

      <Text style={{ margin: 0, whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        {comment.content}
      </Text>

      <PostMedia src={resolveMediaUrl(comment.media_path)} maxHeight={300} />

      <View style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <TouchableOpacity
          type="button"
          onPress={() => toggleCommentLike(comment.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: 'var(--text-primary)' }}
        >
          <SafeIcon src={comment.user_liked ? likedIcon : likeIcon} alt="Like" style={{ width: '16px', height: '16px' }} />
          <Text style={{ fontSize: '0.85rem' }}>
            {Number(comment.like_count) > 0 ? comment.like_count : 'Like'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          type="button"
          onPress={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
          title="Reply"
          aria-label="Reply"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          <SafeIcon src={commentIcon} alt="Reply" style={{ width: '16px', height: '16px' }} />
          <Text>Reply</Text>
        </TouchableOpacity>
      </View>

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
        <View style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
          {comment.replies.map((reply) => renderCommentItem(reply))}
        </View>
      )}
    </View>
  );

  // ADDED: Check if the current user is the author of this post
  const isPostOwner = currentUser && post && currentUser.username === post.username;

  return (
    <View>
      <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
      <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <TouchableOpacity
          className="back-nav-btn"
          onPress={() => navigate(-1)}
        >
          ← Back to Events
        </TouchableOpacity>

        {loading ? (
          <View className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--primary-color, #ccff00)' }}>
            Loading event details...
          </View>
        ) : error || !post ? (
          <View className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
            <Text style={{ color: '#64748b' }}>{error || 'Event not found.'}</Text>
          </View>
        ) : (
          <>
            <View className="post-card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
              <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                  @{post.username}
                </Link>
                <small style={{ color: 'gray' }}>{post.created_at}</small>
              </View>

              {post.event_type && (
                <View className="force-dark-text" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginTop: '10px', marginBottom: '10px' }}>
                  <View style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '4px' }}>{post.event_type}</View>
                  <View style={{ fontSize: '0.95rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <Text>
                      <strong>Time:</strong> {post.event_time}
                    </Text>
                    <Text>
                      <strong>Location:</strong> {post.event_location}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={{ marginTop: '10px', marginBottom: '1rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', fontSize: '1.05rem' }}>
                {post.content}
              </Text>

              <PostMedia src={resolveMediaUrl(post.media_path)} maxHeight={450} />

              <View style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <TouchableOpacity
                  type="button"
                  onPress={toggleLike}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit' }}
                >
                  <SafeIcon src={post.user_liked ? likedIcon : likeIcon} alt="Like" style={{ width: '18px', height: '18px' }} />
                  <Text>{Number(post.like_count) > 0 ? Number(post.like_count) : 'Like'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  type="button"
                  onPress={() => setShowReplyForm((prev) => !prev)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit' }}
                >
                  <SafeIcon src={commentIcon} alt="Reply" style={{ width: '18px', height: '18px' }} />
                  <Text>{Number(post.comment_count) > 0 ? Number(post.comment_count) : 'Reply'}</Text>
                </TouchableOpacity>
                
                {/* ADDED: Edit and Delete buttons aligned to the right */}
                {isPostOwner && (
                    <View style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <TouchableOpacity
                            type="button"
                            onPress={() => navigate(`/post/edit/${post.id}`)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: theme === 'dark' ? '#ccff00' : '#000000',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                padding: 0
                            }}
                        >
                            Edit
                        </TouchableOpacity>
                        <TouchableOpacity
                            type="button"
                            onPress={handleDeletePost}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                padding: 0
                            }}
                        >
                            Delete
                        </TouchableOpacity>
                    </View>
                )}
              </View>
            </View>

            {showReplyForm && (
              <View style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <Text style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Discussion</Text>
                <ReplyComposer
                  value={commentContent}
                  onChange={setCommentContent}
                  onSubmit={(e) => handleCreateComment(e, null)}
                  onCancel={() => setShowReplyForm(false)}
                  submitting={submitting}
                  theme={theme}
                  placeholder={currentUser ? 'Write a reply...' : 'Log in to leave a reply...'}
                />
              </View>
            )}

            <View className="comments-section">
              {comments.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#64748b', margin: '2rem 0' }}>
                  No replies yet. Be the first to reply!
                </Text>
              ) : (
                comments.map((comment) => renderCommentItem(comment))
              )}
            </View>
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

