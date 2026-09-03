import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';
import ImageCropper from '../components/ImageCropper';

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
const likedIcon = getAssetUrl('liked.svg') || unlikedIcon;

const resolveImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getPostMedia = (item) => {
    if (!item) return '';
    const raw = item.media_path || item.image_url || item.image || item.media_url;
    return resolveImageUrl(raw);
};

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

export default function Profile({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
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
    const [pfpPreviewUrl, setPfpPreviewUrl] = useState('');
    const [showCropper, setShowCropper] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);

    const [activeCommentPostId, setActiveCommentPostId] = useState(null);
    const [commentInputs, setCommentInputs] = useState({});
    const [submittingReply, setSubmittingReply] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');

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
    const accentColor = theme === 'dark' ? '#ccff00' : '#000000';

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
                    githubHandle,
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
            setActiveTab('posts');
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

        setPosts((prev) =>
            prev.map((post) =>
                post.id === postId
                    ? {
                        ...post,
                        user_liked: post.user_liked ? 0 : 1,
                        like_count: post.user_liked
                            ? Math.max(0, (post.like_count || 0) - 1)
                            : (post.like_count || 0) + 1,
                    }
                    : post
            )
        );

        try {
            const res = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });
            if (!res.ok) throw new Error(`Server responded with status ${res.status}`);
        } catch (err) {
            console.error('Like request failed:', err);
            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            user_liked: post.user_liked ? 0 : 1,
                            like_count: post.user_liked
                                ? Math.max(0, (post.like_count || 0) - 1)
                                : (post.like_count || 0) + 1,
                        }
                        : post
                )
            );
        }
    };

    const handleAddComment = async (e, postId) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');

        const text = (commentInputs[postId] || '').trim();
        if (!text) return;

        setSubmittingReply(true);
        const fd = new FormData();
        fd.append('content', text);
        fd.append('reply_to', postId);

        try {
            const res = await fetch('/api/posts/create', {
                method: 'POST',
                body: fd,
                credentials: 'include',
            });

            if (res.ok) {
                setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
                setActiveCommentPostId(null);
                fetchProfile();
            }
        } catch (err) {
            console.error('Error submitting comment:', err);
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleFileSelected = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type === 'image/gif') {
            setPfpFile(file);
            setPfpPreviewUrl(URL.createObjectURL(file));
        } else {
            setPendingFile(file);
            setShowCropper(true);
        }
        e.target.value = '';
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setPendingFile(null);
    };

    const handleCropped = (croppedFile) => {
        setPfpFile(croppedFile);
        setPfpPreviewUrl(URL.createObjectURL(croppedFile));
        setShowCropper(false);
        setPendingFile(null);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaveError('');

        const data = new FormData();
        if (formData.age) data.append('age', formData.age);
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
        if (pfpFile) data.append('profile_pic', pfpFile);

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
                setPfpFile(null);
                setPfpPreviewUrl('');
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

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSaveError('');
        setPfpFile(null);
        setPfpPreviewUrl('');
        const rawGithub = profile.github_user || '';
        const githubHandle = rawGithub.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^\/+/, '');
        setFormData({
            age: profile.age || '',
            grade: profile.grade || '',
            interest: profile.interest || '',
            bio: profile.bio || '',
            githubHandle,
            linkedinUrl: profile.linkedin_url || '',
            customLink1: profile.custom_link_1 || '',
            customLink2: profile.custom_link_2 || '',
            customLink3: profile.custom_link_3 || '',
            customLink4: profile.custom_link_4 || '',
            customLink5: profile.custom_link_5 || '',
        });
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

    const topLevelPosts = posts.filter((p) => !p.parent_id);
    const replyPosts = posts.filter((p) => p.parent_id);
    const visiblePosts = activeTab === 'posts' ? topLevelPosts : replyPosts;

    const renderPostCard = (post) => {
        const mediaUrl = getPostMedia(post);
        const isCommentsOpen = activeCommentPostId === post.id;
        const postDate = post.created_at
            ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
            : 'Recently';

        return (
            <div
                key={post.id}
                className="card"
                style={{
                    padding: '1.25rem',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                }}
            >
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

                {post.parent_id && (
                    <div style={{
                        background: theme === 'dark' ? '#000000' : 'var(--bg-color)',
                        color: theme === 'dark' ? '#ffffff' : 'inherit',
                        borderLeft: `4px solid ${accentColor}`,
                        padding: '0.6rem 0.8rem',
                        marginBottom: '0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                    }}>
                        <span style={{ fontWeight: 600 }}>
                            Replying to @{post.parent_username || 'unknown'}:
                        </span>
                        <p style={{ margin: '0.2rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {post.parent_content || 'This post has been deleted.'}
                        </p>
                    </div>
                )}

                {post.category && (
                    <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ display: 'inline-block', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius)', fontSize: '0.8em', color: '#64748b', fontWeight: 500 }}>
                            {post.category}
                        </span>
                    </div>
                )}

                <p style={{ margin: '0 0 0.75rem 0', whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{post.content}</p>

                <PostMedia src={mediaUrl} maxHeight={400} />

                {post.github_link && (
                    <a
                    
                        href={post.github_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            marginBottom: '0.75rem',
                            fontSize: '0.85rem',
                            color: accentColor,
                            wordBreak: 'break-all'
                        }}
                    >
                        {post.github_link}
                    </a>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.85rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                        onClick={() => handleLikePost(post.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'inherit', fontSize: 'inherit' }}
                    >
                        <img
                            src={post.user_liked ? likedIcon : unlikedIcon}
                            alt={post.user_liked ? 'Liked' : 'Unliked'}
                            style={{ width: '18px', height: '18px', filter: 'var(--icon-filter)' }}
                        />
                        <span>{post.like_count || 0}</span>
                    </button>

                    <button
                        onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'inherit', fontSize: 'inherit' }}
                    >
                        <img src={commentIcon} alt="Reply" style={{ width: '18px', height: '18px', filter: 'var(--icon-filter)' }} />
                        <span>{Number(post.comment_count) > 0 ? post.comment_count : 'Reply'}</span>
                    </button>

                    <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: '#64748b', marginLeft: 'auto' }}>
                        View Thread
                    </Link>
                </div>

                {isCommentsOpen && (
                    <ReplyComposer
                        value={commentInputs[post.id] || ''}
                        onChange={(val) => setCommentInputs({ ...commentInputs, [post.id]: val })}
                        onSubmit={(e) => handleAddComment(e, post.id)}
                        onCancel={() => setActiveCommentPostId(null)}
                        submitting={submittingReply}
                        theme={theme}
                        placeholder={`Reply to @${post.username || profile.username}...`}
                    />
                )}
            </div>
        );
    };

    const tabButtonStyle = (isActive) => ({
        flex: 1,
        padding: '0.65rem',
        textAlign: 'center',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.9rem',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${isActive ? accentColor : 'var(--border-color)'}`,
        color: isActive ? accentColor : 'var(--text-secondary, #64748b)',
    });

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

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
                        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <SafeImage
                                    src={pfpPreviewUrl || profile.profile_pic}
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

                                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.95rem' }}>
                                        <div>
                                            <strong style={{ fontWeight: 700 }}>{topLevelPosts.length}</strong> <span style={{ color: '#64748b' }}>Posts</span>
                                        </div>
                                        <Link to={`/followers/${profile.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <strong style={{ fontWeight: 700 }}>{followerCount}</strong> <span style={{ color: '#64748b' }}>Followers</span>
                                        </Link>
                                        <Link to={`/following/${profile.username}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <strong style={{ fontWeight: 700 }}>{followingCount}</strong> <span style={{ color: '#64748b' }}>Following</span>
                                        </Link>
                                    </div>

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
                                                                style={{ filter: 'var(--icon-filter)', width: '22px', height: '22px', transition: 'transform 0.15s ease' }}
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isEditing && (
                                        <form onSubmit={handleSaveProfile} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                            {saveError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{saveError}</p>}

                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>Profile Picture (PNG, JPG, GIF)</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,.gif"
                                                    onChange={handleFileSelected}
                                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                                />
                                                {pfpPreviewUrl && (
                                                    <img
                                                        src={pfpPreviewUrl}
                                                        alt="New profile picture preview"
                                                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginTop: '0.5rem' }}
                                                    />
                                                )}
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
                                                    onClick={handleCancelEdit}
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

                        <div style={{ display: 'flex', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                            <button style={tabButtonStyle(activeTab === 'posts')} onClick={() => setActiveTab('posts')}>
                                Posts ({topLevelPosts.length})
                            </button>
                            <button style={tabButtonStyle(activeTab === 'replies')} onClick={() => setActiveTab('replies')}>
                                Replies ({replyPosts.length})
                            </button>
                        </div>

                        {visiblePosts.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                {activeTab === 'posts' ? 'No posts created yet.' : 'No replies yet.'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {visiblePosts.map(renderPostCard)}
                            </div>
                        )}
                    </>
                )}
            </main>

            {showCropper && pendingFile && (
                <ImageCropper
                    file={pendingFile}
                    onCancel={handleCropCancel}
                    onCropped={handleCropped}
                />
            )}
        </>
    );
}