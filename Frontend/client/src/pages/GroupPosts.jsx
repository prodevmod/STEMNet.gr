import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';

const API_BASE = import.meta.env.VITE_API_URL || '';

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
    const raw = item.media_path || item.image_url || item.image || item.media_url;
    return resolveImageUrl(raw);
};

export default function GroupPosts({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const { groupId } = useParams();
    const navigate = useNavigate();

    const [group, setGroup] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // New Post Form State inside Group
    const [postContent, setPostContent] = useState('');
    const [postImageFile, setPostImageFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchGroupData = useCallback(async () => {
        if (!groupId) {
            setError('Invalid Group ID.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch group details and group posts endpoints
            const [groupRes, postsRes] = await Promise.all([
                fetch(`${API_BASE}/api/groups/${groupId}`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/groups/${groupId}/posts`, { credentials: 'include' })
            ]);

            if (groupRes.ok) {
                const groupData = await groupRes.json();
                setGroup(groupData.group || groupData);
            } else {
                throw new Error('Failed to load group details.');
            }

            if (postsRes.ok) {
                const postsData = await postsRes.json();
                setPosts(postsData.posts || (Array.isArray(postsData) ? postsData : []));
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Error loading group data:', err);
            setError('Could not load community group.');
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
        if (postImageFile) {
            formData.append('image', postImageFile);
        }

        try {
            const res = await fetch(`${API_BASE}/api/posts/create`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (res.ok) {
                setPostContent('');
                setPostImageFile(null);
                fetchGroupData();
            } else {
                alert('Failed to create post within the group.');
            }
        } catch (err) {
            console.error('Error creating post:', err);
            alert('An error occurred while posting.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-primary)' }}>Loading group...</div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div>
                <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
                <main style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', textAlign: 'center' }}>
                    <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Group not found'}</p>
                    <button onClick={() => navigate('/groups')} className="btn btn-primary">Back to Groups</button>
                </main>
            </div>
        );
    }

    return (
        <div>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main className="app-main-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
                <button
                    onClick={() => navigate('/groups')}
                    style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#ccff00' : '#000000', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '500', padding: 0 }}
                >
                    ← Back to Groups
                </button>

                {/* Group Header Card */}
                <div className="card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{group.name}</h2>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                        Created by <Link to={`/profile/${group.username}`}>@{group.username}</Link>
                    </p>
                    <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {group.description}
                    </p>
                </div>

                {/* Create Post inside Group Box */}
                {currentUser ? (
                    <div className="card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                        <form onSubmit={handleCreateGroupPost}>
                            <textarea
                                value={postContent}
                                onChange={(e) => setPostContent(e.target.value)}
                                placeholder={`Share an update with ${group.name}...`}
                                rows="3"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--input-bg, transparent)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setPostImageFile(e.target.files[0])}
                                    style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}
                                />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1.25rem' }}
                                >
                                    {submitting ? 'Posting...' : 'Post to Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: '1rem', marginBottom: '1.5rem', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                            Please <Link to="/login">log in</Link> to participate or post in this group.
                        </p>
                    </div>
                )}

                {/* Group Posts Feed */}
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Group Discussions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {posts.length > 0 ? (
                        posts.map((post) => {
                            const postImage = getPostImage(post);
                            return (
                                <div key={post.id} className="card" style={{ background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}>
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
                                        <Link to={`/post/${post.id}`} style={{ fontSize: '0.85rem', textDecoration: 'none', color: 'var(--primary-color)', fontWeight: '500' }}>
                                            View Thread & Comments →
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                            <p style={{ color: '#64748b', margin: 0 }}>No posts in this group yet. Be the first to start a discussion!</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}