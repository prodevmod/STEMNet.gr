import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

import likeIcon from '../assets/like.svg';
import likedIcon from '../assets/liked.svg';
import commentIcon from '../assets/comment.svg';

// ==========================================
// UTILS & HELPERS
// ==========================================
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
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'underline', wordBreak: 'break-all' }}>
                    {part}
                </a>
            );
        }
        return part;
    });
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PostThread({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const params = useParams();
    const postId = params.postId || params.id;
    
    const navigate = useNavigate();
    const [threadData, setThreadData] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [commentContent, setCommentContent] = useState('');
    const [replyToId, setReplyToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [showMainReplyForm, setShowMainReplyForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const fetchThread = useCallback(async () => {
        if (!postId || postId === 'undefined') {
            setError('Invalid post ID.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/posts/${postId}/thread`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setThreadData(data);
                const rawReplies = data.replies || data.comments || [];
                setComments(buildCommentTree(rawReplies, postId));
            } else {
                setError('Post thread not found.');
            }
        } catch (err) {
            console.error('Error loading thread:', err);
            setError('Failed to load thread.');
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        fetchThread();
    }, [fetchThread]);

    const toggleMainPostLike = async () => {
        if (!currentUser) {
            alert('Please log in to like posts.');
            return;
        }

        setThreadData(prev => {
            if (!prev || !prev.post) return prev;
            const currentlyLiked = Boolean(prev.post.user_liked);
            const count = Number(prev.post.like_count) || 0;
            return {
                ...prev,
                post: {
                    ...prev.post,
                    user_liked: !currentlyLiked ? 1 : 0,
                    like_count: !currentlyLiked ? count + 1 : Math.max(0, count - 1)
                }
            };
        });

        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                credentials: 'include',
method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to toggle post like');
        } catch (err) {
            console.error('Error liking post:', err);
            fetchThread();
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
                credentials: 'include',
method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to toggle comment like');
        } catch (err) {
            console.error('Error liking comment:', err);
            fetchThread();
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
                    setShowMainReplyForm(false);
                }
                await fetchThread();
            } else {
                alert('Failed to post reply.');
            }
        } catch (err) {
            console.error('Error posting reply:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        
        try {
            const res = await fetch(`/api/posts/${postId}/delete`, {
                credentials: 'include',
method: 'DELETE', 
                credentials: 'include'
            });
            
            if (res.ok) {
                navigate('/'); 
            } else {
                alert('Failed to delete the post. Please try again.');
            }
        } catch (err) {
            console.error('Error deleting post:', err);
            alert('An error occurred while deleting the post.');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;

        try {
            const res = await fetch(`/api/posts/${commentId}/delete`, {
                credentials: 'include',
method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                await fetchThread();
            } else {
                alert('Failed to delete comment.');
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    const inputStyle = {
        flex: 1,
        padding: '0.5rem 0.75rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-color, #333333)',
        background: theme === 'dark' ? '#121212' : '#ffffff',
        color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
    };

    const helperTextStyle = {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        fontSize: '0.9rem',
    };

    const renderCommentItem = (comment) => {
        const replyImage = getPostImage(comment);
        const isCommentOwner = currentUser && currentUser.username === comment.username;

        return (
            <View
                key={comment.id}
                className="card"
                style={{
                    padding: '1rem',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    width: '100%',
                    boxSizing: 'border-box'
                }}
            >
                {/* Header: Username Left, Date Right */}
                <View
                    style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                    }}
                >
                    <Link
                        to={`/profile/${comment.username}`}
                        style={{
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            color: 'var(--primary-color)',
                            fontSize: '0.85rem',
                        }}
                    >
                        @{comment.username}
                    </Link>
                    {comment.created_at && (
                        <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {comment.created_at}
                        </small>
                    )}
                </View>

                <Text
                    style={{
                        margin: '0.4rem 0',
                        whiteSpace: 'pre-line',
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                        color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                    }}
                >
                    {renderTextWithLinks(comment.content)}
                </Text>

                {replyImage && (
                    <View style={{ marginTop: '0.5rem', maxHeight: '300px', overflow: 'hidden' }}>
                        <img
                            src={replyImage}
                            alt="Reply attachment"
                            style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', borderRadius: '6px' }}
                        />
                    </View>
                )}

                {/* Action Bar: Like & Reply (Far Left) | Edit & Delete (Far Right via marginLeft auto) */}
                <View
                    style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        marginTop: '0.75rem',
                    }}
                >
                    <View style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <TouchableOpacity
                            type="button"
                            onPress={() => toggleCommentLike(comment.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: 0,
                                color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                                fontSize: '0.85rem',
                            }}
                        >
                            <img 
                                src={comment.user_liked ? likedIcon : likeIcon} 
                                alt={comment.user_liked ? 'Liked' : 'Like'} 
                                style={{ width: '18px', height: '18px', display: 'block' }} 
                            />
                            <Text>{Number(comment.like_count) > 0 ? comment.like_count : 'Like'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            type="button"
                            onPress={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                            title="Reply"
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: 0,
                                color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                                fontSize: '0.85rem',
                            }}
                        >
                            <img 
                                src={commentIcon} 
                                alt="Reply" 
                                style={{ width: '18px', height: '18px', display: 'block' }} 
                            />
                            <Text>Reply</Text>
                        </TouchableOpacity>
                    </View>

                    {isCommentOwner && (
                        <View style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <TouchableOpacity
                                type="button"
                                onPress={() => navigate(`/post/edit/${comment.id}`)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: theme === 'dark' ? '#ccff00' : '#000000',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    padding: 0
                                }}
                            >
                                Edit
                            </TouchableOpacity>
                            <TouchableOpacity
                                type="button"
                                onPress={() => handleDeleteComment(comment.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    padding: 0
                                }}
                            >
                                Delete
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {replyToId === comment.id && (
                    <View
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
                                    border: '1px solid var(--border-color, #333333)',
                                    background: theme === 'dark' ? '#121212' : '#ffffff',
                                    color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                                    fontSize: '0.9rem',
                                }}
                            />
                            <View style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <TouchableOpacity
                                    type="button"
                                    onPress={() => setReplyToId(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'gray',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    Cancel
                                </TouchableOpacity>
                                <TouchableOpacity
                                    type="submit"
                                    disabled={submitting || !replyContent.trim()}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '0.3rem 0.75rem',
                                        fontSize: '0.85rem',
                                    }}
                                >
                                    {submitting ? 'Sending...' : 'Reply'}
                                </TouchableOpacity>
                            </View>
                        </form>
                    </View>
                )}

                {comment.replies && comment.replies.length > 0 && (
                    <View style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
                        {comment.replies.map((reply) => renderCommentItem(reply))}
                    </View>
                )}
            </View>
        );
    };

    if (loading) return <View style={{ textAlign: 'center', padding: '3rem', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>Loading thread...</View>;
    
    if (error || !threadData) {
        return (
            <>
                <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
                <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
                    <Text style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Post not found'}</Text>
                    <TouchableOpacity onPress={() => navigate('/')} className="btn btn-primary">Go back to Home</TouchableOpacity>
                </main>
            </>
        );
    }

    const { post, parent } = threadData;
    const postImage = getPostImage(post);
    const isOwner = currentUser && currentUser.username === post.username;

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <TouchableOpacity 
                    onPress={() => navigate(-1)} 
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: theme === 'dark' ? '#ccff00' : '#000000',
                        cursor: 'pointer', 
                        marginBottom: '1.25rem', 
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        padding: '0'
                    }}
                >
                    ← Back
                </TouchableOpacity>

                {parent && (
                    <View className="card" style={{ padding: '1rem', opacity: 0.8, marginBottom: '0.75rem', borderLeft: '3px solid var(--primary-color)' }}>
                        <View style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <Link to={`/profile/${parent.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>@{parent.username}</Link>
                            {parent.created_at && <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.8rem' }}>{parent.created_at}</small>}
                        </View>
                        <Text style={{ margin: '0.5rem 0 0', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(parent.content)}</Text>
                    </View>
                )}

                {/* Main Post Card */}
                <View className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                    {/* Header */}
                    <View style={{ display: 'flex', width: '100%', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            @{post.username}
                        </Link>
                        {post.created_at && (
                            <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{post.created_at}</small>
                        )}
                    </View>

                    {post.content && <Text style={{ whiteSpace: 'pre-line', wordBreak: 'break-word', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(post.content)}</Text>}
                    
                    {postImage && (
                        <View style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', borderRadius: '8px', overflow: 'hidden', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                            <img src={postImage} alt="Attachment" style={{ maxWidth: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }} />
                        </View>
                    )}

                    {/* Main Post Bottom Bar */}
                    <View
                        style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border-color)',
                        }}
                    >
                        <View style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                            <TouchableOpacity
                                type="button"
                                onPress={toggleMainPostLike}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: 0,
                                    color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                                    fontSize: '0.9rem',
                                }}
                            >
                                <img 
                                    src={post.user_liked ? likedIcon : likeIcon} 
                                    alt={post.user_liked ? 'Liked' : 'Like'} 
                                    style={{ width: '18px', height: '18px', display: 'block' }} 
                                />
                                <Text>{Number(post.like_count) > 0 ? post.like_count : 'Like'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                type="button"
                                onPress={() => setShowMainReplyForm(prev => !prev)}
                                title="Reply"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: 0,
                                    color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                                    fontSize: '0.9rem',
                                }}
                            >
                                <img 
                                    src={commentIcon} 
                                    alt="Reply" 
                                    style={{ width: '18px', height: '18px', display: 'block' }} 
                                />
                                <Text>Reply</Text>
                            </TouchableOpacity>
                        </View>

                        {isOwner && (
                            <View style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <TouchableOpacity 
                                    onPress={() => navigate(`/post/edit/${postId}`)}
                                    style={{ 
                                        padding: '0.4rem 1rem', 
                                        backgroundColor: 'transparent', 
                                        color: theme === 'dark' ? '#ccff00' : '#000000',
                                        border: '1px solid ' + (theme === 'dark' ? '#ccff00' : '#000000'),
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Edit
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={handleDeletePost}
                                    style={{ 
                                        padding: '0.4rem 1rem', 
                                        backgroundColor: '#ef4444', 
                                        color: '#ffffff', 
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '500',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Delete
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Main Post Reply Input (toggled via Reply button) */}
                {showMainReplyForm && (
                    <form onSubmit={(e) => handleCreateComment(e)} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            placeholder="Post your reply..."
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            style={inputStyle}
                        />
                        <TouchableOpacity type="submit" disabled={submitting || !commentContent.trim()} className="btn btn-primary">
                            {submitting ? 'Posting...' : 'Reply'}
                        </TouchableOpacity>
                    </form>
                )}

                <Text style={{ color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>Replies</Text>
                <View style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {comments && comments.length > 0 ? (
                        comments.map((comment) => renderCommentItem(comment))
                    ) : (
                        <Text style={helperTextStyle}>No replies yet. Be the first to reply!</Text>
                    )}
                </View>
            </main>
        </>
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

