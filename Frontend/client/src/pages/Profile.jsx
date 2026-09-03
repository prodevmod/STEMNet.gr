import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const globAssets = import.meta.glob('../assets/*', { eager: true, import: 'default' });
const SUPPORTED_PFP_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const FALLBACK_PFP_OUTPUT_MIME_TYPE = 'image/png';
const PFP_CROP_VIEWPORT_SIZE = 240;
const PFP_MIN_ZOOM = 1;
const PFP_MAX_ZOOM = 3;

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


    const baseCropStyle = {
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0
    };

    if (error || !src) {
        return (
            <div
                className={className}
                onClick={onClick}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    color: 'var(--text-color)',
                    backgroundColor: 'var(--border-color)',
                    userSelect: 'none',
                    ...baseCropStyle,
                    ...style
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
            style={{
                ...baseCropStyle,
                ...style
            }}
            onError={() => setError(true)}
        />
    );
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getFitScale = (imageWidth, imageHeight, viewportSize) => (
    Math.max(viewportSize / imageWidth, viewportSize / imageHeight)
);

const clampCropOffset = (x, y, imageWidth, imageHeight, viewportSize, zoom) => {
    const fitScale = getFitScale(imageWidth, imageHeight, viewportSize) * zoom;
    const scaledWidth = imageWidth * fitScale;
    const scaledHeight = imageHeight * fitScale;
    const maxOffsetX = Math.max(0, (scaledWidth - viewportSize) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - viewportSize) / 2);
    return {
        x: clamp(x, -maxOffsetX, maxOffsetX),
        y: clamp(y, -maxOffsetY, maxOffsetY),
    };
};

const cropAvatarFromImage = async ({ imageSourceUrl, imageWidth, imageHeight, zoom, offsetX, offsetY, outputType }) => {
    const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode selected image.'));
        img.src = imageSourceUrl;
    });

    const fitScale = getFitScale(imageWidth, imageHeight, PFP_CROP_VIEWPORT_SIZE) * zoom;
    const scaledImageX = (PFP_CROP_VIEWPORT_SIZE - (imageWidth * fitScale)) / 2 + offsetX;
    const scaledImageY = (PFP_CROP_VIEWPORT_SIZE - (imageHeight * fitScale)) / 2 + offsetY;

    const sourceX = clamp((-scaledImageX) / fitScale, 0, imageWidth);
    const sourceY = clamp((-scaledImageY) / fitScale, 0, imageHeight);
    const sourceSize = clamp(PFP_CROP_VIEWPORT_SIZE / fitScale, 1, Math.min(imageWidth, imageHeight));
    const normalizedSourceX = clamp(sourceX, 0, imageWidth - sourceSize);
    const normalizedSourceY = clamp(sourceY, 0, imageHeight - sourceSize);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to process image.');

    ctx.drawImage(
        image,
        normalizedSourceX,
        normalizedSourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    const finalType = outputType && outputType !== 'image/gif'
        ? outputType
        : FALLBACK_PFP_OUTPUT_MIME_TYPE;

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((createdBlob) => {
            if (createdBlob) {
                resolve(createdBlob);
            } else {
                reject(new Error('Failed to generate cropped image.'));
            }
        }, finalType, 0.92);
    });

    return { blob, outputType: finalType };
};

const replaceFileExtension = (filename, mimeType) => {
    const extensionByMime = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    };
    const targetExtension = extensionByMime[mimeType] || 'png';
    const baseName = filename.includes('.') ? filename.replace(/\.[^.]+$/, '') : filename;
    return `${baseName}.${targetExtension}`;
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
    const [pfpImageMeta, setPfpImageMeta] = useState(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState(null);

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

    useEffect(() => () => {
        if (pfpPreviewUrl) {
            URL.revokeObjectURL(pfpPreviewUrl);
        }
    }, [pfpPreviewUrl]);

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

            try {
                const res = await fetch(`/api/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        postId,
                        post_id: postId,
                        userId: currentUser?.id,
                        user_id: currentUser?.id,
                    }),
                });

                if (!res.ok) {
                    throw new Error(`Server responded with status ${res.status}`);
                }
            } catch (err) {
                console.error('Like request failed:', err);
                
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
            }
        };

    const handleAddComment = async (postId, e) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');

        const text = (commentInputs[postId] || '').trim();
        if (!text) return;

        const formData = new FormData();
        formData.append('content', text);
        formData.append('reply_to', postId);

        try {
            const res = await fetch('/api/posts/create', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (res.ok) {
                setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
                fetchProfile();
            }
        } catch (err) {
            console.error('Error submitting comment:', err);
        }
    };
   
const handleProfilePicSelection = async (selectedFile) => {
        if (!selectedFile) {
            if (pfpPreviewUrl) URL.revokeObjectURL(pfpPreviewUrl);
            setPfpFile(null);
            setPfpPreviewUrl('');
            setPfpImageMeta(null);
            setCropZoom(1);
            setCropOffset({ x: 0, y: 0 });
            return;
        }

        const normalizedType = (selectedFile.type || '').toLowerCase();
        if (!SUPPORTED_PFP_MIME_TYPES.has(normalizedType)) {
            setSaveError('Unsupported profile image type. Please use JPG, JPEG, PNG, WEBP, or GIF.');
            return;
        }

        const nextPreviewUrl = URL.createObjectURL(selectedFile);
        try {
            const img = await new Promise((resolve, reject) => {
                const imageEl = new Image();
                imageEl.onload = () => resolve(imageEl);
                imageEl.onerror = () => reject(new Error('Invalid or corrupt image file.'));
                imageEl.src = nextPreviewUrl;
            });

            if (pfpPreviewUrl) URL.revokeObjectURL(pfpPreviewUrl);
            setPfpFile(selectedFile);
            setPfpPreviewUrl(nextPreviewUrl);
            setPfpImageMeta({
                width: img.naturalWidth,
                height: img.naturalHeight,
                type: normalizedType,
                name: selectedFile.name || 'profile-image',
            });
            setCropZoom(1);
            setCropOffset({ x: 0, y: 0 });
            setSaveError('');
        } catch (error) {
            URL.revokeObjectURL(nextPreviewUrl);
            setSaveError(error.message || 'Invalid or corrupt image file.');
        }
    };

    const resetProfileEditState = () => {
        if (pfpPreviewUrl) URL.revokeObjectURL(pfpPreviewUrl);
        setSaveError('');
        setPfpFile(null);
        setPfpPreviewUrl('');
        setPfpImageMeta(null);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });

        const rawGithub = profile?.github_user || '';
        const githubHandle = rawGithub.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/^\/+/, '');
        setFormData({
            age: profile?.age || '',
            grade: profile?.grade || '',
            interest: profile?.interest || '',
            bio: profile?.bio || '',
            githubHandle,
            linkedinUrl: profile?.linkedin_url || '',
            customLink1: profile?.custom_link_1 || '',
            customLink2: profile?.custom_link_2 || '',
            customLink3: profile?.custom_link_3 || '',
            customLink4: profile?.custom_link_4 || '',
            customLink5: profile?.custom_link_5 || '',
        });
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

        if (pfpFile && pfpPreviewUrl && pfpImageMeta) {
            try {
                const constrainedOffset = clampCropOffset(
                    cropOffset.x,
                    cropOffset.y,
                    pfpImageMeta.width,
                    pfpImageMeta.height,
                    PFP_CROP_VIEWPORT_SIZE,
                    cropZoom,
                );
                const { blob, outputType } = await cropAvatarFromImage({
                    imageSourceUrl: pfpPreviewUrl,
                    imageWidth: pfpImageMeta.width,
                    imageHeight: pfpImageMeta.height,
                    zoom: cropZoom,
                    offsetX: constrainedOffset.x,
                    offsetY: constrainedOffset.y,
                    outputType: pfpImageMeta.type,
                });
                const croppedName = replaceFileExtension(pfpImageMeta.name, outputType);
                const croppedFile = new File([blob], croppedName, { type: outputType });
                data.append('profile_pic', croppedFile);
            } catch (error) {
                setSaveError(error.message || 'Failed to process profile image.');
                return;
            }
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
                if (pfpPreviewUrl) URL.revokeObjectURL(pfpPreviewUrl);
                setPfpFile(null);
                setPfpPreviewUrl('');
                setPfpImageMeta(null);
                setCropZoom(1);
                setCropOffset({ x: 0, y: 0 });
            } else {
                const errData = await res.json().catch(() => ({}));
                setSaveError(errData.error || 'Failed to update profile.');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            setSaveError('Server error while saving.');
        }
    };

    const imageScale = pfpImageMeta ? getFitScale(pfpImageMeta.width, pfpImageMeta.height, PFP_CROP_VIEWPORT_SIZE) * cropZoom : 1;
    const imageRenderWidth = pfpImageMeta ? pfpImageMeta.width * imageScale : 0;
    const imageRenderHeight = pfpImageMeta ? pfpImageMeta.height * imageScale : 0;
    const constrainedCropOffset = pfpImageMeta
        ? clampCropOffset(cropOffset.x, cropOffset.y, pfpImageMeta.width, pfpImageMeta.height, PFP_CROP_VIEWPORT_SIZE, cropZoom)
        : { x: 0, y: 0 };
    const imageLeft = (PFP_CROP_VIEWPORT_SIZE - imageRenderWidth) / 2 + constrainedCropOffset.x;
    const imageTop = (PFP_CROP_VIEWPORT_SIZE - imageRenderHeight) / 2 + constrainedCropOffset.y;

    const startCropDrag = (event) => {
        if (!pfpImageMeta) return;
        setDragStart({
            pointerX: event.clientX,
            pointerY: event.clientY,
            originX: constrainedCropOffset.x,
            originY: constrainedCropOffset.y,
        });
    };

    const onCropDrag = (event) => {
        if (!dragStart || !pfpImageMeta) return;
        const deltaX = event.clientX - dragStart.pointerX;
        const deltaY = event.clientY - dragStart.pointerY;
        const nextOffset = clampCropOffset(
            dragStart.originX + deltaX,
            dragStart.originY + deltaY,
            pfpImageMeta.width,
            pfpImageMeta.height,
            PFP_CROP_VIEWPORT_SIZE,
            cropZoom,
        );
        setCropOffset(nextOffset);
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
                        {/* PROFILE HEADER */}
                        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                                {/* Profile Picture */}
                                <SafeImage
                                    src={profile.profile_pic}
                                    alt={profile.username}
                                    style={{ width: '85px', height: '85px' }}
                                />


                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>@{profile.username}</h2>

                                        {isOwnProfile ? (
                                            !isEditing && (
                                                <button onClick={() => { setIsEditing(true); resetProfileEditState(); }} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
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
                                                <label htmlFor="profile-picture-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                                    Profile Picture (JPG, JPEG, PNG, WEBP, GIF)
                                                </label>
                                                <input
                                                    id="profile-picture-input"
                                                    type="file"
                                                    accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                                                    onChange={(e) => handleProfilePicSelection(e.target.files?.[0])}
                                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                                />
                                                {pfpImageMeta && pfpPreviewUrl && (
                                                    <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                                                            Drag image to reposition. Use zoom controls to frame your avatar.
                                                        </p>
                                                        <div
                                                            role="application"
                                                            aria-label="Profile photo crop area"
                                                            onPointerDown={startCropDrag}
                                                            onPointerMove={onCropDrag}
                                                            onPointerUp={() => setDragStart(null)}
                                                            onPointerLeave={() => setDragStart(null)}
                                                            style={{
                                                                width: `${PFP_CROP_VIEWPORT_SIZE}px`,
                                                                height: `${PFP_CROP_VIEWPORT_SIZE}px`,
                                                                maxWidth: '100%',
                                                                borderRadius: '50%',
                                                                border: '2px solid var(--border-color)',
                                                                margin: '0 auto',
                                                                position: 'relative',
                                                                overflow: 'hidden',
                                                                cursor: dragStart ? 'grabbing' : 'grab',
                                                                touchAction: 'none',
                                                                background: '#0f172a',
                                                            }}
                                                        >
                                                            <img
                                                                src={pfpPreviewUrl}
                                                                alt="Selected profile crop"
                                                                draggable={false}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: `${imageTop}px`,
                                                                    left: `${imageLeft}px`,
                                                                    width: `${imageRenderWidth}px`,
                                                                    height: `${imageRenderHeight}px`,
                                                                    userSelect: 'none',
                                                                    pointerEvents: 'none',
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '0.4rem' }}>
                                                            <label htmlFor="profile-crop-zoom" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                                Zoom
                                                            </label>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <button
                                                                    type="button"
                                                                    aria-label="Zoom out profile photo"
                                                                    onClick={() => setCropZoom((prev) => clamp(prev - 0.1, PFP_MIN_ZOOM, PFP_MAX_ZOOM))}
                                                                    style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    id="profile-crop-zoom"
                                                                    type="range"
                                                                    min={PFP_MIN_ZOOM}
                                                                    max={PFP_MAX_ZOOM}
                                                                    step="0.01"
                                                                    value={cropZoom}
                                                                    onChange={(e) => setCropZoom(clamp(Number(e.target.value), PFP_MIN_ZOOM, PFP_MAX_ZOOM))}
                                                                    style={{ flex: 1 }}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label="Zoom in profile photo"
                                                                    onClick={() => setCropZoom((prev) => clamp(prev + 0.1, PFP_MIN_ZOOM, PFP_MAX_ZOOM))}
                                                                    style={{ padding: '0.2rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'transparent', color: 'inherit' }}
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'grid', justifyContent: 'center', gap: '0.35rem' }}>
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>Crop preview</span>
                                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                                                <img
                                                                    src={pfpPreviewUrl}
                                                                    alt="Final profile photo preview"
                                                                    draggable={false}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        top: `${(imageTop / PFP_CROP_VIEWPORT_SIZE) * 80}px`,
                                                                        left: `${(imageLeft / PFP_CROP_VIEWPORT_SIZE) * 80}px`,
                                                                        width: `${(imageRenderWidth / PFP_CROP_VIEWPORT_SIZE) * 80}px`,
                                                                        height: `${(imageRenderHeight / PFP_CROP_VIEWPORT_SIZE) * 80}px`,
                                                                        userSelect: 'none',
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
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
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        resetProfileEditState();
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
                                                    <img src={postImage} alt="Post attachment" style={{ maxWidth: '100%', borderRadius: '6px', maxHeight: '600px', height: 'auto', objectFit: 'contain', display: 'block' }} />
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
                                                    <span>{Number(post.comment_count) > 0 ? Number(post.comment_count) : 'Reply'}</span>
                                                </button>

                                                <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: '#64748b', marginLeft: 'auto' }}>
                                                    View Thread
                                                </Link>
                                            </div>

                                            {/* COMMENT ACCORDION */}
                                            {isCommentsOpen && (
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>

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