import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';
import ReplyComposer from '../components/ReplyComposer';

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

export default function PostThread({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const params = useParams();
    const postId = params.postId || params.id;

    const navigate = useNavigate();
    const [threadData, setThreadData] = useState(null);
    const [rawReplies, setRawReplies] = useState([]);
    const [repliesPage, setRepliesPage] = useState(1);
    const [hasMoreReplies, setHasMoreReplies] = useState(false);
    const [loadingMoreReplies, setLoadingMoreReplies] = useState(false);
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
                const replies = data.replies || data.comments || [];
                setRawReplies(replies);
                setHasMoreReplies(Boolean(data.has_more_replies));
                setRepliesPage(1);
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

    const handleLoadMoreReplies = async () => {
        setLoadingMoreReplies(true);
        try {
            const nextPage = repliesPage + 1;
            const res = await fetch(`/api/posts/${postId}/thread?page=${nextPage}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                const newReplies = data.replies || data.comments || [];
                setRawReplies((prev) => [...prev, ...newReplies]);
                setHasMoreReplies(Boolean(data.has_more_replies));
                setRepliesPage(nextPage);
            }
        } catch (err) {
            console.error('Error loading more replies:', err);
        } finally {
            setLoadingMoreReplies(false);
        }
    };

    const comments = buildCommentTree(rawReplies, postId);

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

        setRawReplies((prev) => prev.map((item) => {
            if (String(item.id) === String(commentId)) {
                const currentlyLiked = Boolean(item.user_liked);
                const count = Number(item.like_count) || 0;
                return {
                    ...item,
                    user_liked: !currentlyLiked ? 1 : 0,
                    like_count: !currentlyLiked ? count + 1 : Math.max(0, count - 1)
                };
            }
            return item;
        }));

        try {
            const response = await fetch(`/api/posts/${commentId}/like`, {
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

    const helperTextStyle = {
        color: theme === 'dark' ? '#94a3b8' : '#64748b',
        fontSize: '0.9rem',
    };

    const renderCommentItem = (comment) => {
        const replyImage = getPostImage(comment);
        const isCommentOwner = currentUser && currentUser.username === comment.username;

        return (
            <div
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
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <Link
                        to={`/profile/${comment.username}`}
                        style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--primary-color)', fontSize: '0.85rem' }}
                    >
                        @{comment.username}
                    </Link>
                    {comment.created_at && (
                        <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {comment.created_at}
                        </small>
                    )}
                </div>

                <p
                    style={{
                        margin: '0.4rem 0',
                        whiteSpace: 'pre-line',
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                        color: theme === 'dark' ? '#f3f4f6' : '#1e293b',
                    }}
                >
                    {renderTextWithLinks(comment.content)}
                </p>

                <PostMedia src={replyImage} maxHeight={300} />

                <div style={{ display: 'flex', width: '100%', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <button
                            type="button"
                            onClick={() => toggleCommentLike(comment.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: theme === 'dark' ? '#f3f4f6' : '#1e293b', fontSize: '0.85rem' }}
                        >
                            <span>{comment.user_liked ? '★' : '☆'}</span>
                            <span>{Number(comment.like_count) > 0 ? comment.like_count : 'Like'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                            title="Reply"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: theme === 'dark' ? '#f3f4f6' : '#1e293b', fontSize: '0.85rem' }}
                        >
                            <span>Reply</span>
                        </button>
                    </div>

                    {isCommentOwner && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => navigate(`/post/edit/${comment.id}`)}
                                style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#ccff00' : '#000000', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', padding: 0 }}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', padding: 0 }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
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
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>Loading thread...</div>;

    if (error || !threadData) {
        return (
            <>
                <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
                <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
                    <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Post not found'}</p>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Go back to Home</button>
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
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', color: theme === 'dark' ? '#ccff00' : '#000000', cursor: 'pointer', marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: '500', padding: '0' }}
                >
                    ← Back
                </button>

                {parent && (
                    <div className="card" style={{ padding: '1rem', opacity: 0.8, marginBottom: '0.75rem', borderLeft: '3px solid var(--primary-color)' }}>
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                            <Link to={`/profile/${parent.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>@{parent.username}</Link>
                            {parent.created_at && <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.8rem' }}>{parent.created_at}</small>}
                        </div>
                        <p style={{ margin: '0.5rem 0 0', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(parent.content)}</p>
                    </div>
                )}

                <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            @{post.username}
                        </Link>
                        {post.created_at && (
                            <small style={{ marginLeft: 'auto', color: 'gray', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{post.created_at}</small>
                        )}
                    </div>

                    {post.content && <p style={{ whiteSpace: 'pre-line', wordBreak: 'break-word', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(post.content)}</p>}

                    <PostMedia src={postImage} maxHeight={600} />

                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={toggleMainPostLike}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: theme === 'dark' ? '#f3f4f6' : '#1e293b', fontSize: '0.9rem' }}
                            >
                                <span>{post.user_liked ? '★' : '☆'}</span>
                                <span>{Number(post.like_count) > 0 ? post.like_count : 'Like'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowMainReplyForm(prev => !prev)}
                                title="Reply"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, color: theme === 'dark' ? '#f3f4f6' : '#1e293b', fontSize: '0.9rem' }}
                            >
                                <span>Reply</span>
                            </button>
                        </div>

                        {isOwner && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <button
                                    onClick={() => navigate(`/post/edit/${postId}`)}
                                    style={{ padding: '0.4rem 1rem', backgroundColor: 'transparent', color: theme === 'dark' ? '#ccff00' : '#000000', border: '1px solid ' + (theme === 'dark' ? '#ccff00' : '#000000'), borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={handleDeletePost}
                                    style={{ padding: '0.4rem 1rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showMainReplyForm && (
                    <ReplyComposer
                        value={commentContent}
                        onChange={setCommentContent}
                        onSubmit={(e) => handleCreateComment(e)}
                        onCancel={() => setShowMainReplyForm(false)}
                        submitting={submitting}
                        theme={theme}
                        placeholder="Post your reply..."
                    />
                )}

                <h3 style={{ color: theme === 'dark' ? '#f3f4f6' : '#1e293b', marginTop: '1.5rem' }}>Replies</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {comments && comments.length > 0 ? (
                        <>
                            {comments.map((comment) => renderCommentItem(comment))}
                            {hasMoreReplies && (
                                <button
                                    onClick={handleLoadMoreReplies}
                                    disabled={loadingMoreReplies}
                                    className="btn btn-primary"
                                    style={{ alignSelf: 'center', padding: '0.5rem 1.25rem', marginTop: '0.5rem' }}
                                >
                                    {loadingMoreReplies ? 'Loading...' : 'Load More Replies'}
                                </button>
                            )}
                        </>
                    ) : (
                        <p style={helperTextStyle}>No replies yet. Be the first to reply!</p>
                    )}
                </div>
            </main>
        </>
    );
}