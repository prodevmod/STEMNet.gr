import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
            <Text 
                className={className} 
                onPress={onClick}
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
            </Text>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className} 
            width={width} 
            height={height} 
            onPress={onClick}
            style={style}
            onError={() => setError(true)} 
        />
    );
};

export default function Search({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryParam = searchParams.get('q') || '';
    
    const [searchQuery, setSearchQuery] = useState(queryParam);
    const [results, setResults] = useState({ posts: [], groups: [], users: [] });
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!queryParam.trim()) {
            setResults({ posts: [], groups: [], users: [] });
            return;
        }

        const fetchSearchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(queryParam, { credentials: 'include' })}`, {
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
                credentials: 'include',
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
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main className="app-main-container">
                {/* SEARCH FORM SECTION */}
                <section className="card narrow-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <Text style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 700 }}>Search STEMNet</Text>
                    <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="text" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            placeholder="Search posts, groups, or users..." 
                            style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'inherit' }}
                        />
                        <TouchableOpacity type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem' }}>
                            Search
                        </TouchableOpacity>
                    </form>
                </section>

                <section>
                    {loading && <View className="card" style={{ textAlign: 'center', padding: '2rem' }}>Searching...</View>}

                    {!loading && queryParam && totalCount === 0 && (
                        <View className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                            <Text>No results found for &quot;{queryParam}&quot;.</Text>
                        </View>
                    )}

                    {!loading && totalCount > 0 && (
                        <View>
                            <Text style={{ marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                                Found {totalCount} total result(s) for &quot;{queryParam}&quot;
                            </Text>

                            {/* USERS ROW */}
                            {results.users.length > 0 && (
                                <View style={{ marginBottom: '2rem' }}>
                                    <Text style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Users</Text>
                                    <View style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                        {results.users.map((user) => (
                                            <View key={user.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <SafeImage
                                                    src={user.profile_pic}
                                                    alt={user.username?.[0]?.toUpperCase() || 'U'}
                                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                                <View style={{ overflow: 'hidden' }}>
                                                    <Link to={`/profile/${user.username}`} style={{ textDecoration: 'none', fontWeight: 600, color: 'inherit' }}>
                                                        @{user.username}
                                                    </Link>
                                                    {user.interest && (
                                                        <View style={{ fontSize: '0.75rem', color: 'gray', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {user.interest}
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* GROUPS ROW */}
                            {results.groups.length > 0 && (
                                <View style={{ marginBottom: '2rem' }}>
                                    <Text style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Groups</Text>
                                    <View style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                        {results.groups.map((group) => (
                                            <View key={group.id} className="card" style={{ padding: '1rem' }}>
                                                <Link to={`/group/${group.id}`} style={{ textDecoration: 'none', fontWeight: 600, fontSize: '1.05rem', color: 'inherit' }}>
                                                    {group.name}
                                                </Link>
                                                <Text style={{ fontSize: '0.85rem', color: 'gray', margin: '0.4rem 0' }}>
                                                    {group.description || 'No description provided.'}
                                                </Text>
                                                <small style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    Created by @{group.owner_username}
                                                </small>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* POSTS ROW */}
                            {results.posts.length > 0 && (
                                <View id="posts-container">
                                    <Text style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>Posts</Text>
                                    {results.posts.map((post) => (
                                        <View key={post.id} className="post-card card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
                                            <View className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Link to={`/profile/${post.username}`} className="username">
                                                    @{post.username}
                                                </Link>
                                                <small className="timestamp">
                                                    <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'gray' }}>
                                                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''} ↗
                                                    </Link>
                                                </small>
                                            </View>

                                            {post.category && (
                                                <View style={{ marginTop: '8px', marginBottom: '4px' }}>
                                                    <Text style={{ display: 'inline-block', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '2px 8px', borderRadius: 'var(--radius)', fontSize: '0.8em', fontWeight: 500 }}>
                                                        Category: {post.category}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Added post content display here */}
                                            <Text style={{ marginTop: '10px', fontSize: '0.95rem', color: 'inherit', wordBreak: 'break-word' }}>
                                                {post.content}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}
                </section>
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

