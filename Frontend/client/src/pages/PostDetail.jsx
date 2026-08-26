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
    // Handle both :postId or :id naming conventions from App.jsx safely
    const params = useParams();
    const postId = params.postId || params.id;
    
    const navigate = useNavigate();
    const [threadData, setThreadData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyContent, setReplyContent] = useState('');

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

    const handleAddReply = async (e) => {
        e.preventDefault();
        if (!currentUser) return navigate('/login');
        if (!replyContent.trim()) return;

        try {
            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: replyContent }),
            });
            if (res.ok) {
                setReplyContent('');
                fetchThread();
            }
        } catch (err) {
            console.error('Error posting reply:', err);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading thread...</div>;
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
                        <p style={{ margin: '0.5rem 0 0' }}>{renderTextWithLinks(parent.content)}</p>
                    </div>
                )}

                <div className="card" style={{ padding: '1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <Link to={`/profile/${post.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none' }}>
                            @{post.username}
                        </Link>
                    </div>
                    {post.content && <p style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{renderTextWithLinks(post.content)}</p>}
                    
                    {postImage && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.02)' }}>
                            <img src={postImage} alt="Attachment" style={{ maxWidth: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }} />
                        </div>
                    )}
                </div>

                <form onSubmit={handleAddReply} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        placeholder="Post your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                    />
                    <button type="submit" className="btn btn-primary">Reply</button>
                </form>

                <h3>Replies</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {replies && replies.length > 0 ? (
                        replies.map((reply) => {
                            const replyImage = getPostImage(reply);
                            return (
                                <div key={reply.id} className="card" style={{ padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                                    <Link to={`/profile/${reply.username}`} style={{ fontWeight: 'bold', color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                        @{reply.username}
                                    </Link>
                                    <p style={{ margin: '0.4rem 0', whiteSpace: 'pre-line', wordBreak: 'break-word', fontSize: '0.9rem' }}>
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
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No replies yet. Be the first to reply!</p>
                    )}
                </div>
            </main>
        </>
    );
}