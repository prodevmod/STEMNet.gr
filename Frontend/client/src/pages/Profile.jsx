import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

// Dynamically resolve assets to prevent Vite build/transform errors if file names vary
const globAssets = import.meta.glob('../assets/*', { eager: true, import: 'default' });

const getAssetUrl = (filename) => {
    const keys = Object.keys(globAssets);
    const found = keys.find((key) => key.toLowerCase().endsWith(filename.toLowerCase()));
    return found ? globAssets[found] : '';
};

const githubIcon = getAssetUrl('github.svg');
const linkedinIcon = getAssetUrl('linkedin.svg');
const linkIcon = getAssetUrl('link.svg');
const commentIcon = getAssetUrl('comment.svg');
const unlikedIcon = getAssetUrl('like.svg');
const likedIcon = getAssetUrl('liked.svg') || getAssetUrl('liked.svg') || unlikedIcon;

const SafeImage = ({ src, alt, className, style, onClick }) => {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div
                className={className}
                onClick={onClick}
                style={{
                    ...style,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--border-color)',
                    borderRadius: '50%',
                    userSelect: 'none'
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
            style={style}
            onError={() => setError(true)}
        />
    );
};

export default function Profile({ currentUser, setCurrentUser, theme, toggleTheme }) {
    const { username } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');

    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const [isEditing, setIsEditing] = useState(false);
    const [pfpFile, setPfpFile] = useState(null);

    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});

    const [formData, setFormData] = useState({
        age: '',
        grade: '',
        interest: '',
        bio: '',
        githubHandle: '',
        linkedinUrl: '',
        customLink1: '',
        customLink2: '',
        customLink3: '',
        customLink4: '',
        customLink5: '',
    });

    const isOwnProfile = currentUser && currentUser.username === username;

    const fetchProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/profile/${username}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const u = data.user || {};
                setProfile(u);
                setPosts(data.posts || []);

                setIsFollowing(Boolean(data.is_following));
                setFollowerCount(data.stats?.followers ?? 0);
                setFollowingCount(data.stats?.following ?? 0);

                const rawGithub = u.github_user || '';
                const githubHandle = rawGithub.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^\/+/, '');

                setFormData({
                    age: u.age || '',
                    grade: u.grade || '',
                    interest: u.interest || '',
                    bio: u.bio || '',
                    githubHandle: githubHandle,
                    linkedinUrl: u.linkedin_url || '',
                    customLink1: u.custom_link_1 || '',
                    customLink2: u.custom_link_2 || '',
                    customLink3: u.custom_link_3 || '',
                    customLink4: u.custom_link_4 || '',
                    customLink5: u.custom_link_5 || '',
                });
            } else {
                setError('User not found.');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (username) {
            fetchProfile();
        }
    }, [username]);

    const handleToggleFollow = async () => {
        if (!currentUser) return navigate('/login');
        const endpoint = isFollowing ? `/api/unfollow/${profile.id}` : `/api/follow/${profile.id}`;
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (res.ok) {
                const nextState = !isFollowing;
                setIsFollowing(nextState);
                setFollowerCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
            }
        } catch (err) {
            console.error('Error toggling follow:', err);
        }
    };

    const handleLikePost = async (postId) => {
        if (!currentUser) return navigate('/login');

        // Optimistic UI update
        setPosts((prevPosts) =>
            prevPosts.map((post) => {
                if (post.id === postId) {
                    const wasLiked = Boolean(post.user_liked);
                    return {
                        ...post,
                        user_liked: wasLiked ? 0 : 1,
                        like_count: wasLiked ? Math.max(0, (post.like_count || 0) - 1) : (post.like_count || 0) + 1,
                    };
                }
                return post;
            })
        );

        const payload = JSON.stringify({
            postId,
            post_id: postId,
            userId: currentUser?.id,
            user_id: currentUser?.id,
        });

        const headers = { 'Content-Type': 'application/json' };
        const endpoints = [
            `/api/posts/${postId}/like`,
            `/api/post/${postId}/like`,
            `/api/like/${postId}`,
            `/api/like`
        ];

        let success = false;

        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: payload,
                });

                if (res.ok) {
                    success = true;
                    break;
                }
            } catch (err) {
                // Continue to next endpoint fallback
            }
        }

        if (!success) {
            console.warn('Like request failed on all endpoint attempts.');
        }
    };

    const handleAddComment = async (postId, e) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');

        const text = (commentInputs[postId] || '').trim();
        if (!text) return;

        try {
            let res = await fetch(`/api/post/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: text }),
            });

            if (res.status === 404) {
                res = await fetch(`/api/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content: text }),
                });
            }

            if (res.ok) {
                const newCommentData = await res.json();
                setPosts((prevPosts) =>
                    prevPosts.map((post) => {
                        if (post.id === postId) {
                            const currentComments = post.comments || [];
                            return {
                                ...post,
                                comments: [...currentComments, newCommentData.comment || newCommentData],
                            };
                        }
                        return post;
                    })
                );
                setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
            }
        } catch (err) {
            console.error('Error submitting comment:', err);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaveError('');

        const data = new FormData();
        if (formData.age) {
            data.append('age', formData.age);
        }
        
        data.append('grade', formData.grade || '');
        data.append('interest', formData.interest || '');
        data.append('bio', formData.bio || '');
        data.append('github_user', formData.githubHandle ? `https://github.com/${formData.githubHandle}` : '');
        data.append('linkedin_url', formData.linkedinUrl || '');
        data.append('custom_link_1', formData.customLink1 || '');
        data.append('custom_link_2', formData.customLink2 || '');
        data.append('custom_link_3', formData.customLink3 || '');
        data.append('custom_link_4', formData.customLink4 || '');
        data.append('custom_link_5', formData.customLink5 || '');

        if (pfpFile) {
            data.append('profile_pic', pfpFile);
        }

        try {
            const res = await fetch('/api/profile/edit', {
                method: 'POST',
                credentials: 'include',
                body: data, 
            });

            if (res.ok) {
                const updatedData = await res.json();
                if (updatedData.user) {
                    setProfile(updatedData.user);
                    if (setCurrentUser) setCurrentUser(updatedData.user);
                }
                setIsEditing(false);
                fetchProfile();
            } else {
                const errData = await res.json().catch(() => ({}));
                setSaveError(errData.error || 'Failed to update profile.');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            setSaveError('Server error while saving.');
        }
    };

    const linksList = [
        profile?.github_user && { label: 'GitHub', url: profile.github_user, icon: githubIcon },
        profile?.linkedin_url && { label: 'LinkedIn', url: profile.linkedin_url, icon: linkedinIcon },
        profile?.custom_link_1 && { label: 'Link 1', url: profile.custom_link_1, icon: linkIcon },
        profile?.custom_link_2 && { label: 'Link 2', url: profile.custom_link_2, icon: linkIcon },
        profile?.custom_link_3 && { label: 'Link 3', url: profile.custom_link_3, icon: linkIcon },
        profile?.custom_link_4 && { label: 'Link 4', url: profile.custom_link_4, icon: linkIcon },
        profile?.custom_link_5 && { label: 'Link 5', url: profile.custom_link_5, icon: linkIcon },
    ].filter(Boolean);

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                {loading && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        Loading profile...
                    </div>
                )}

                {error && (
                    <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                {!loading && profile && (
                    <>
                        {/* PROFILE HEADER */}
                        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <SafeImage
                                    src={profile.profile_pic}
                                    alt={profile.username}
                                    style={{ width: '85px', height: '85px', borderRadius: '50%', objectFit: 'cover' }}
                                />

                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>@{profile.username}</h2>

                                        {isOwnProfile ? (
                                            !isEditing && (
                                                <button onClick={() => setIsEditing(true)} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                                                    Edit Profile
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                onClick={handleToggleFollow}
                                                className={`btn ${isFollowing ? '' : 'btn-primary'}`}
                                                style={{
                                                    padding: '0.4rem 1.1rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 600,
                                                    borderRadius: 'var(--radius)',
                                                    cursor: 'pointer',
                                                    ...(isFollowing ? { background: 'transparent', border: '1px solid var(--border-color)', color: 'inherit' } : {})
                                                }}
                                            >
                                                {isFollowing ? 'Unfollow' : 'Follow'}
                                            </button>
                                        )}
                                    </div>

                                    {/* COUNTERS */}
                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                                        <div>
                                            <strong style={{ fontWeight: 700 }}>{posts.length}</strong> <span style={{ color: '#64748b' }}>Posts</span>
                                        </div>
                                        <Link to={`/followers/${profile.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <strong style={{ fontWeight: 700 }}>{followerCount}</strong> <span style={{ color: '#64748b' }}>Followers</span>
                                        </Link>
                                        <Link to={`/following/${profile.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <strong style={{ fontWeight: 700 }}>{followingCount}</strong> <span style={{ color: '#64748b' }}>Following</span>
                                        </Link>
                                    </div>

                                    {/* BIO & METADATA */}
                                    {!isEditing && (
                                        <div style={{ marginTop: '1rem' }}>
                                            {profile.bio && <p style={{ margin: '0 0 0.5rem 0', whiteSpace: 'pre-line' }}>{profile.bio}</p>}
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                                {profile.age && <span>Age: {profile.age}</span>}
                                                {profile.grade && <span>Grade: {profile.grade}</span>}
                                                {profile.interest && <span>Interest: {profile.interest}</span>}
                                            </div>

                                            {linksList.length > 0 && (
                                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
                                                    {linksList.map((lnk, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={lnk.url.startsWith('http') ? lnk.url : `https://${lnk.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title={lnk.label}
                                                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <img
                                                                src={lnk.icon}
                                                                alt={lnk.label}
                                                                style={{
                                                                    filter: 'var(--icon-filter)',
                                                                    width: '22px',
                                                                    height: '22px',
                                                                    transition: 'transform 0.15s ease'
                                                                }}
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* EDIT PROFILE FORM */}
                                    {isEditing && (
                                        <form onSubmit={handleSaveProfile} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            {saveError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{saveError}</p>}

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Profile Picture (PNG, JPG, GIF)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,.gif"
                                                    onChange={(e) => setPfpFile(e.target.files[0])}
                                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Age</label>
                                                    <input
                                                        type="number"
                                                        value={formData.age}
                                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Grade</label>
                                                    <input
                                                        type="text"
                                                        value={formData.grade}
                                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Interest</label>
                                                <input
                                                    type="text"
                                                    value={formData.interest}
                                                    onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                                    style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Bio</label>
                                                <textarea
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                    rows="2"
                                                    style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>GitHub Username</label>
                                                    <input
                                                        type="text"
                                                        value={formData.githubHandle}
                                                        onChange={(e) => setFormData({ ...formData, githubHandle: e.target.value })}
                                                        placeholder="username"
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>LinkedIn URL</label>
                                                    <input
                                                        type="text"
                                                        value={formData.linkedinUrl}
                                                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                                                        placeholder="https://linkedin.com/in/..."
                                                        style={{ width: '100%', padding: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Custom Links</label>
                                                {[1, 2, 3, 4, 5].map((num) => (
                                                    <input
                                                        key={num}
                                                        type="text"
                                                        value={formData[`customLink${num}`]}
                                                        onChange={(e) => setFormData({ ...formData, [`customLink${num}`]: e.target.value })}
                                                        placeholder={`Custom Link ${num}`}
                                                        style={{ width: '100%', padding: '0.4rem', marginBottom: '0.4rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                                                    />
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Save Changes</button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        setSaveError('');
                                                        setPfpFile(null);
                                                        const rawGithub = profile.github_user || '';
                                                        const githubHandle = rawGithub.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^\/+/, '');
                                                        setFormData({
                                                            age: profile.age || '',
                                                            grade: profile.grade || '',
                                                            interest: profile.interest || '',
                                                            bio: profile.bio || '',
                                                            githubHandle: githubHandle,
                                                            linkedinUrl: profile.linkedin_url || '',
                                                            customLink1: profile.custom_link_1 || '',
                                                            customLink2: profile.custom_link_2 || '',
                                                            customLink3: profile.custom_link_3 || '',
                                                            customLink4: profile.custom_link_4 || '',
                                                            customLink5: profile.custom_link_5 || '',
                                                        });
                                                    }} 
                                                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* POSTS LIST */}
                        {posts.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                No posts created yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {posts.map((post) => {
                                    const postImage = post.image_url || post.image;
                                    const isCommentsOpen = activeCommentPostId === post.id;
                                    const postDate = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'Recently';
                                    const commentsList = post.comments || [];

                                    return (
                                        <div key={post.id} className="card" style={{ 
                                            padding: '1.25rem', 
                                            backgroundColor: 'var(--card-bg)', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: '8px'
                                        }}>
                                            {/* POST HEADER */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <Link to={`/profile/${post.username}`} style={{ color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none' }}>
                                                    @{post.username || profile.username}
                                                </Link>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{postDate}</span>
                                                    <Link to={`/post/${post.id}`} title="View in thread" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.9rem' }}>
                                                        →
                                                    </Link>
                                                </div>
                                            </div>

                                            {/* CONTENT */}
                                            <p style={{ margin: '0 0 0.75rem 0', whiteSpace: 'pre-line' }}>{post.content}</p>

                                            {/* MEDIA */}
                                            {postImage && (
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <img src={postImage} alt="Post attachment" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '400px', objectFit: 'cover' }} />
                                                </div>
                                            )}

                                            {/* POST ACTIONS */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                                                {/* LIKE BUTTON WITH SVG ASSETS */}
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
                                                        fontSize: 'inherit'
                                                    }}
                                                >
                                                    <img
                                                        src={post.user_liked ? likedIcon : unlikedIcon}
                                                        alt={post.user_liked ? 'Liked' : 'Unliked'}
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            filter: 'var(--icon-filter)'
                                                        }}
                                                    />
                                                    <span>{post.like_count || 0}</span>
                                                </button>

                                                {/* REPLY BUTTON */}
                                                <button
                                                    onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem',
                                                        color: 'inherit',
                                                        fontSize: 'inherit'
                                                    }}
                                                >
                                                    <img
                                                        src={commentIcon}
                                                        alt="Reply"
                                                        style={{
                                                            width: '18px',
                                                            height: '18px',
                                                            filter: 'var(--icon-filter)'
                                                        }}
                                                    />
                                                    <span>{commentsList.length}</span>
                                                </button>

                                                <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: '#64748b', marginLeft: 'auto' }}>
                                                    View Thread
                                                </Link>
                                            </div>

                                            {/* COMMENT ACCORDION */}
                                            {isCommentsOpen && (
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                                                    {commentsList.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                            {commentsList.map((c, cIdx) => (
                                                                <div key={c.id || cIdx} style={{ fontSize: '0.85rem', background: 'var(--border-color)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                                    <strong>@{c.username || c.user?.username}: </strong>
                                                                    <span>{c.content || c.text}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <form onSubmit={(e) => handleAddComment(post.id, e)} style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Write a reply..."
                                                            value={commentInputs[post.id] || ''}
                                                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                                            style={{
                                                                flex: 1,
                                                                padding: '0.4rem 0.6rem',
                                                                fontSize: '0.85rem',
                                                                borderRadius: 'var(--radius)',
                                                                border: '1px solid var(--border-color)',
                                                                background: 'var(--card-bg)',
                                                                color: 'inherit'
                                                            }}
                                                        />
                                                        <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                                                            Reply
                                                        </button>
                                                    </form>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    );
}