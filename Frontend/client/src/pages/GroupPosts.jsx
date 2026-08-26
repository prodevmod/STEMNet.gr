import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import likedIcon from '../assets/liked.svg';
import likeIcon from '../assets/like.svg';
import commentIcon from '../assets/comment.svg';

const SafeImage = ({ src, alt, className, width, height, onClick, style }) => {
  const [error, setError] = useState(false);
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  if (error || !src) {
    return (
      <span
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

export default function GroupPosts({ currentUser, theme, toggleTheme }) {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyPostId, setReplyPostId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchGroupAndPosts = async () => {
    try {
      const resGroup = await fetch(`/api/groups/${groupId}`, { credentials: 'include' });
      if (!resGroup.ok) throw new Error('Failed to fetch group details');
      const data = await resGroup.json();
      
      setGroup(data.group);
      setPosts(Array.isArray(data.posts) ? data.posts : []);
    } catch (err) {
      console.error('Error fetching group posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupAndPosts();
  }, [groupId]);

  const toggleLike = async (e, postId) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to like posts.');
      navigate('/login');
      return;
    }

    // Optimistically update the UI instantly so user doesn't wait for refresh or lag
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const isCurrentlyLiked = post.user_liked > 0;
          const newLikedStatus = isCurrentlyLiked ? 0 : 1;
          const newCount = isCurrentlyLiked ? Math.max(0, post.like_count - 1) : post.like_count + 1;
          return { ...post, like_count: newCount, user_liked: newLikedStatus };
        }
        return post;
      })
    );

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.status === 401) {
        alert('Please log in to like posts.');
        return;
      }
      if (!response.ok) {
        // Revert if server request fails
        fetchGroupAndPosts();
        return;
      }
      const data = await response.json();

      // Sync with exact server response data if available
      const serverCount = data.count !== undefined ? data.count : (data.likes_count !== undefined ? data.likes_count : null);
      const serverLiked = data.liked !== undefined ? data.liked : (data.user_liked !== undefined ? data.user_liked : null);

      if (serverCount !== null && serverLiked !== null) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, like_count: serverCount, user_liked: serverLiked ? 1 : 0 }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Like error:', err);
      fetchGroupAndPosts(); // Revert on error
    }
  };

  const handleCommentClick = (postId) => {
    if (!currentUser) {
      alert('Please log in to reply or comment on posts.');
      navigate('/login');
      return;
    }
    setReplyPostId(replyPostId === postId ? null : postId);
  };

  const submitReply = async (parentPostId) => {
    if (!replyContent.trim()) return;

    const formData = new FormData();
    formData.append('content', replyContent);
    formData.append('reply_to', parentPostId);
    formData.append('group_id', groupId);

    try {
      const res = await fetch('/api/posts/create', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (res.ok) {
        setReplyContent('');
        setReplyPostId(null);
        fetchGroupAndPosts();
      }
    } catch (err) {
      console.error('Error submitting reply:', err);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />
        <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#ccff00' }}>
            Loading group discussions...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />

      <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
            {/* Group Header Card */}
            {group && (
            <div className="card" style={{ padding: '1.5rem', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ margin: '0 0 0.3rem 0', color: 'var(--text-primary)' }}>{group.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Created by <Link to={`/profile/${group.username}`}>@{group.username}</Link>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Forced White text and border configuration */}
                    <Link 
                    to="/groups" 
                    className="btn btn-outline" 
                    style={{ 
                        fontSize: '0.8rem', 
                        padding: '0.4rem 0.8rem', 
                        color: '#ffffff !important', 
                        borderColor: '#ffffff',
                        backgroundColor: 'transparent'
                    }}
                    >
                    <span style={{ color: '#ffffff' }}>← Back to Groups</span>
                    </Link>
                    {currentUser && (
                    <Link to={`/create-post?group_id=${group.id}`} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        + Post in Group
                    </Link>
                    )}
                </div>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {group.description}
                </p>
            </div>
            )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Group Discussions</h3>
        </div>

        {/* Group Posts Feed */}
        <div id="posts-container">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="post-card card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/profile/${post.username}`} className="username" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    @{post.username}
                  </Link>
                  <small style={{ color: 'gray' }}>
                    <Link to={`/post/${post.id}`} style={{ color: 'gray', textDecoration: 'none' }}>
                      {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''} ↗
                    </Link>
                  </small>
                </div>

                {/* Parent Reply Quote Box */}
                {post.parent_id && post.parent_content && (
                  <div style={{
                    background: theme === 'dark' ? '#000000' : 'var(--bg-color)',
                    color: theme === 'dark' ? '#ffffff' : 'inherit',
                    borderLeft: '4px solid var(--primary-color)',
                    padding: '0.6rem 0.8rem',
                    marginTop: '0.5rem',
                    marginBottom: '0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}>
                    <span style={{ fontWeight: 600, color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                      Replying to @{post.parent_username}:
                    </span>
                    <p style={{ margin: '0.2rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: theme === 'dark' ? '#ffffff' : 'inherit' }}>
                      {post.parent_content}
                    </p>
                  </div>
                )}

                {/* Category Badge */}
                {post.category && (
                  <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                    <span style={{ display: 'inline-block', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius)', fontSize: '0.8em', color: '#64748b', fontWeight: 500 }}>
                      🏷️ {post.category}
                    </span>
                  </div>
                )}

                {/* Content */}
                <p style={{ marginTop: '8px', marginBottom: '0.75rem', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
                  {post.content}
                </p>

                {/* Media Attachment */}
                {post.media_path && (
                  <div style={{ marginBottom: '0.75rem', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: '350px' }}>
                    {post.media_path.match(/\.(mp4|webm)$/i) ? (
                      <video controls style={{ width: '100%', maxHeight: '350px', objectFit: 'cover' }}>
                        <source src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`} type="video/mp4" />
                      </video>
                    ) : (
                      <SafeImage
                        src={post.media_path.startsWith('http') ? post.media_path : `/static/${post.media_path}`}
                        alt="Group post media"
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
                      src={post.user_liked > 0 ? likedIcon : likeIcon}
                      alt={post.user_liked > 0 ? 'Liked' : 'Like'}
                      width="16"
                      height="16"
                      className={post.user_liked > 0 ? 'like-pop' : ''}
                    />
                    <span>{post.like_count > 0 ? post.like_count : 'Like'}</span>
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

                {/* Inline Reply Form */}
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
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
              <p style={{ color: '#64748b', margin: '0 0 1rem 0' }}>No discussions posted in this group yet.</p>
              {currentUser && (
                <Link to={`/create-post?group_id=${groupId}`} className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                  Start the first discussion
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}