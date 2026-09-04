import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';

const API_BASE = import.meta.env.VITE_API_URL || '';

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getPostImage = (item) => {
  if (!item) return '';
  const raw = item.media_path || item.image_url || item.image || item.media_url;
  return resolveImageUrl(raw);
};

const normalizePostId = (post) => {
  const raw = post?.id ?? post?.post_id ?? null;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export default function GroupPosts({
  currentUser,
  setCurrentUser,
  theme,
  toggleTheme,
  hasUnreadNotifications
}) {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [postContent, setPostContent] = useState('');
  const [postImageFile, setPostImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Group State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchGroupData = useCallback(async () => {
    if (!groupId) {
      setError('Invalid Group ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('Group not found.');
        } else {
          setError('Failed to load group details.');
        }
        setGroup(null);
        setPosts([]);
        return;
      }

      const data = await res.json();
      const groupData = data.group || null;
      setGroup(groupData);
      setPosts(Array.isArray(data.posts) ? data.posts : []);

      if (groupData) {
        setEditName(groupData.name || '');
        setEditDescription(groupData.description || '');
      }
    } catch (err) {
      console.error('Error loading group data:', err);
      setError('Could not load community group.');
      setGroup(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleCreateGroupPost = async (e) => {
    e.preventDefault();

    if (!currentUser) {
      alert('Please log in to post in this group.');
      return;
    }

    if (!postContent.trim() && !postImageFile) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', postContent.trim());
    formData.append('group_id', groupId);
    if (postImageFile) formData.append('image', postImageFile);

    try {
      const res = await fetch(`${API_BASE}/api/posts/create`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        alert('Failed to create post within the group.');
        return;
      }

      setPostContent('');
      setPostImageFile(null);
      await fetchGroupData();
    } catch (err) {
      console.error('Error creating post:', err);
      alert('An error occurred while posting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editDescription.trim()) {
      alert('Name and description are required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() }),
        credentials: 'include'
      });

      if (res.ok) {
        setIsEditingGroup(false);
        await fetchGroupData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update group.');
      }
    } catch (err) {
      console.error('Error updating group:', err);
      alert('An error occurred while updating the group.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group? All posts inside it will also be deleted.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/delete`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        navigate('/groups');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete group.');
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('An error occurred while deleting the group.');
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          theme={theme}
          toggleTheme={toggleTheme}
          hasUnreadNotifications={hasUnreadNotifications}
        />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-primary)' }}>
          Loading group...
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div>
        <Navbar
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          theme={theme}
          toggleTheme={toggleTheme}
          hasUnreadNotifications={hasUnreadNotifications}
        />
        <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
          <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Group not found'}</p>
          <button onClick={() => navigate('/groups')} className="btn btn-primary">
            Back to Groups
          </button>
        </main>
      </div>
    );
  }

  // Determine if current user is the owner of the group
  // Adjust based on whether your API returns group.user_id matching currentUser.id or similar fields
  const isOwner = currentUser && (group.user_id === currentUser.id || group.username === currentUser.username);

  return (
    <div>
      <Navbar
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        theme={theme}
        toggleTheme={toggleTheme}
        hasUnreadNotifications={hasUnreadNotifications}
      />

      <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <button
          onClick={() => navigate('/groups')}
          style={{
            background: 'none',
            border: 'none',
            color: theme === 'dark' ? '#ccff00' : '#000000',
            cursor: 'pointer',
            marginBottom: '1rem',
            fontSize: '0.95rem',
            fontWeight: '500',
            padding: 0
          }}
        >
          ← Back to Groups
        </button>

        <div
          className="card"
          style={{
            background: 'var(--card-bg, #fff)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}
        >
          {isEditingGroup ? (
            <form onSubmit={handleUpdateGroup}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>Edit Group</h3>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Group Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg, transparent)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows="3"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg, transparent)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" disabled={editSubmitting} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setIsEditingGroup(false)} style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{group.name}</h2>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                    Created by <Link to={`/profile/${group.creator_username || group.username}`}>@{group.creator_username || group.username}</Link>
                  </p>
                </div>
                {isOwner && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setIsEditingGroup(true)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteGroup}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                {group.description}
              </p>
            </>
          )}
        </div>

        {currentUser ? (
          <div
            className="card"
            style={{
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}
          >
            <form onSubmit={handleCreateGroupPost}>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`Share an update with ${group.name}...`}
                rows="3"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg, transparent)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  marginBottom: '0.75rem'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPostImageFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}
                />
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                  {submitting ? 'Posting...' : 'Post to Group'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '1rem',
              marginBottom: '1.5rem',
              background: 'var(--card-bg, #fff)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius)'
            }}
          >
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
              Please <Link to="/login">log in</Link> to participate or post in this group.
            </p>
          </div>
        )}

        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Group Discussions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.length > 0 ? (
            posts.map((post) => {
              const postImage = getPostImage(post);
              const postId = normalizePostId(post);

              return (
                <div
                  key={`group-post-${post?.id ?? post?.post_id ?? Math.random()}`}
                  className="card"
                  style={{
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius)',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Link
                      to={`/profile/${post.username}`}
                      style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}
                    >
                      @{post.username}
                    </Link>
                    {post.created_at && (
                      <small style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.8rem' }}>
                        {post.created_at}
                      </small>
                    )}
                  </div>

                  <p style={{ margin: '0.5rem 0', whiteSpace: 'pre-line', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                    {post.content}
                  </p>

                  <PostMedia src={postImage} maxHeight={400} />

                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                    {postId ? (
                      <Link
                        to={`/post/${postId}`}
                        style={{ fontSize: '0.85rem', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: '500' }}
                      >
                        View Thread & Comments →
                      </Link>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Thread unavailable</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '2.5rem',
                background: 'var(--card-bg, #fff)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius)'
              }}
            >
              <p style={{ color: '#64748b', margin: 0 }}>
                No posts in this group yet. Be the first to start a discussion!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}