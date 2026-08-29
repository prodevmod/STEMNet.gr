import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

export default function Search({ currentUser }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q') || '';
    
    const [searchQuery, setSearchQuery] = useState(queryParam);
    const [results, setResults] = useState({ posts: [], groups: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    useEffect(() => {
        if (!queryParam.trim()) {
            setResults({ posts: [], groups: [], users: [] });
            return;
        }

        const fetchSearchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(queryParam)}`, {
                    credentials: 'include'
                });
                if (res.ok) {
                    const data = await res.json();
                    setResults({
                        posts: data.posts || [],
                        groups: data.groups || [],
                        users: data.users || []
                    });
                }
            } catch (err) {
                console.error('Error fetching search results:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSearchResults();
    }, [queryParam]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setSearchParams({ q: searchQuery.trim() });
        }
    };

    const toggleLike = async (e, postId) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in to like posts.');
            navigate('/login');
            return;
        }

        try {
            const res = await fetch(`/api/like/${postId}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (res.ok) {
                const data = await res.json();
                setResults((prev) => ({
                    ...prev,
                    posts: prev.posts.map((item) =>
                        item.id === postId
                            ? { ...item, user_liked: data.liked ? 1 : 0, like_count: data.count }
                            : item
                    )
                }));

                const iconElement = document.getElementById(`like-icon-${postId}`);
                if (iconElement) {
                    iconElement.classList.remove('like-pop');
                    void iconElement.offsetWidth;
                    iconElement.classList.add('like-pop');
                }
            }
        } catch (err) {
            console.error('Error toggling like:', err);
        }
    };

    const totalCount = (results.users?.length || 0) + (results.groups?.length || 0) + (results.posts?.length || 0);

    return (
        <>
            <Navbar currentUser={currentUser} theme={theme} toggleTheme={toggleTheme} />

            <main className="app-main-container">
                {/* SEARCH FORM SECTION */}
                <section className="card narrow-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>Search STEMNet</h2>
                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Search posts, groups, or users..." 
                            style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
                            Search
                        </button>
                    </form>
                </section>

                <section>
                    {loading && <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Searching...</div>}

                    {!loading && queryParam && totalCount === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                            <p>No results found for &quot;{queryParam}&quot;.</p>
                        </div>
                    )}

                    {!loading && totalCount > 0 && (
                        <div>
                            <p style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                Found {totalCount} total result(s) for &quot;{queryParam}&quot;
                            </p>

                            {/* USERS ROW */}
                            {results.users.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Users</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                        {results.users.map((user) => (
                                            <div key={user.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <SafeImage
                                                    src={user.profile_pic}
                                                    alt={user.username?.[0]?.toUpperCase() || 'U'}
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                                <div style={{ overflow: 'hidden' }}>
                                                    <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', fontWeight: 600, color: 'inherit' }}>
                                                        @{user.username}
                                                    </Link>
                                                    {user.interest && (
                                                        <div style={{ fontSize: '0.75rem', color: 'gray', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {user.interest}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* GROUPS ROW */}
                            {results.groups.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Groups</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                        {results.groups.map((group) => (
                                            <div key={group.id} className="card" style={{ padding: '1rem' }}>
                                                <Link to={`/group/${group.id}`} style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', color: 'inherit' }}>
                                                    {group.name}
                                                </Link>
                                                <p style={{ fontSize: '0.85rem', color: 'gray', margin: '0.4rem 0' }}>
                                                    {group.description || 'No description provided.'}
                                                </p>
                                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Created by @{group.owner_username}
                                                </small>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* POSTS ROW */}
                            {results.posts.length > 0 && (
                                <div id="posts-container">
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Posts</h3>
                                    {results.posts.map((post) => (
                                        <div key={post.id} className="post-card card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                                            <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Link to={`/profile/${post.username}`} className="username">
                                                    @{post.username}
                                                </Link>
                                                <small className="timestamp">
                                                    <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'gray' }}>
                                                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''} ↗
                                                    </Link>
                                                </small>
                                            </div>

                                            {post.category && (
                                                <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                                                    <span style={{ display: 'inline-block', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius)', fontSize: '0.8em', fontWeight: 500 }}>
                                                        Category: {post.category}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Added post content display here */}
                                            <p style={{ marginTop: '10px', fontSize: '0.95rem', color: 'inherit', wordBreak: 'break-word' }}>
                                                {post.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </>
    );
}