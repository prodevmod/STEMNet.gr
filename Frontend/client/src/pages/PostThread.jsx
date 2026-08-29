import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

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

export default function PostThread({ currentUser, setCurrentUser, theme, toggleTheme }) {
    const params = useParams();
    const postId = params.postId || params.id;
    
    const navigate = useNavigate();
    const [threadData, setThreadData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [commentContent, setCommentContent] = useState('');
    const [replyToId, setReplyToId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchThread = async () => {
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
            } else {
                setError('Post thread not found.');
            }
        } catch (err) {
            console.error('Error loading thread:', err);
            setError('Failed to load thread.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThread();
    }, [postId]);


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
                console.error('Failed to delete post');
                alert('Failed to delete the post. Please try again.');
            }
        } catch (err) {
            console.error('Error deleting post:', err);
            alert('An error occurred while deleting the post.');
        }
    };

    // Theme-aware styles
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

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>Loading thread...</div>;
    
    if (error || !threadData) {
        return (
            <>
                <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem', textAlign: 'center' }}>
                    <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error || 'Post not found'}</p>
                    <button onClick={() => navigate('/')} className="btn btn-primary">Go back to Home</button>
                </main>
            </>
        );
    }

    const { post, parent, replies } = threadData;
    const postImage = getPostImage(post);
    const isOwner = currentUser && currentUser.username === post.username;

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <button 
                    onClick={() => navigate(-1)} 
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
                </button>

                {parent && (
                    <div className="card" style={{ padding: '1rem', opacity: 0.8, marginBottom: '0.75rem', borderLeft: '3px solid var(--primary-color)' }}>
                        <Link to={`/profile/${parent.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>@{parent.username}</Link>
                        <p style={{ margin: '0.5rem 0 0', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(parent.content)}</p>
                    </div>
                )}

                <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            @{post.username}
                        </Link>
                    </div>
                    {post.content && <p style={{ whiteSpace: 'pre-line', wordBreak: 'break-word', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>{renderTextWithLinks(post.content)}</p>}
                    
                    {postImage && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', borderRadius: '8px', overflow: 'hidden', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                            <img src={postImage} alt="Attachment" style={{ maxWidth: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }} />
                        </div>
                    )}

                    {/* Edit & Delete Buttons for Post Owner */}
                    {isOwner && (
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <button 
                                onClick={() => navigate(`/post/edit/${postId}`)}
                                style={{ 
                                    padding: '0.4rem 1rem', 
                                    backgroundColor: 'transparent', 
                                    color: theme === 'dark' ? '#ccff00' : '#000000',
                                    border: '1px solid ' + (theme === 'dark' ? '#ccff00' : '#000000'),
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Edit
                            </button>
                            <button 
                                onClick={handleDeletePost}
                                style={{ 
                                    padding: '0.4rem 1rem', 
                                    backgroundColor: '#ef4444', 
                                    color: '#ffffff', 
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleCreateComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="Post your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        style={inputStyle}
                    />
                    <button type="submit" className="btn btn-primary">Reply</button>
                </form>

                <h3 style={{ color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>Replies</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {replies && replies.length > 0 ? (
                        replies.map((reply) => {
                            const replyImage = getPostImage(reply);
                            return (
                                <div key={reply.id} className="card" style={{ padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                    <Link to={`/profile/${reply.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                        @{reply.username}
                                    </Link>
                                    <p style={{ margin: '0.4rem 0', whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '0.9rem', color: theme === 'dark' ? '#f3f4f6' : '#1e293b' }}>
                                        {renderTextWithLinks(reply.content)}
                                    </p>
                                    {replyImage && (
                                        <div style={{ marginTop: '0.5rem', maxHeight: '300px', overflow: 'hidden' }}>
                                            <img src={replyImage} alt="Reply attachment" style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', borderRadius: '6px' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p style={helperTextStyle}>No replies yet. Be the first to reply!</p>
                    )}
                </div>
            </main>
        </>
    );
}