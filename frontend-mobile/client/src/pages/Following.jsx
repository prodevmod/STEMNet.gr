import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

const SafeAvatar = ({ src, username }) => {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <View
                style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    color: 'var(--text-color)',
                    flexShrink: 0
                }}
            >
                {username ? username[0].toUpperCase() : 'U'}
            </View>
        );
    }

    return (
        <img
            src={src}
            alt={username}
            onError={() => setError(true)}
            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
    );
};

export default function Following({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications }) {
    const { username } = useParams();
    const [followingList, setFollowingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchFollowing = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await fetch(`/api/following/${username}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setFollowingList(data);
                } else {
                    setError('Failed to load following list.');
                }
            } catch (err) {
                console.error('Error fetching following list:', err);
                setError('Server error while loading list.');
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchFollowing();
        }
    }, [username]);

    return (
        <>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />

            <main style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem' }}>
                <View style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to={`/profile/${username}`} style={{ textDecoration: 'none', color: 'var(--primary-color)', fontSize: '0.9rem' }}>
                        ← Back to @{username}
                    </Link>
                    <Text style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Following</Text>
                </View>

                {loading && (
                    <View className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        Loading following list...
                    </View>
                )}

                {error && (
                    <View className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                        {error}
                    </View>
                )}

                {!loading && !error && (
                    followingList.length === 0 ? (
                        <View className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                            @{username} is not following anyone yet.
                        </View>
                    ) : (
                        <View style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {followingList.map((user) => (
                                <View key={user.id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <SafeAvatar src={user.profile_pic} username={user.username} />
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Link
                                            to={`/profile/${user.username}`}
                                            style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700, fontSize: '1rem', display: 'block' }}
                                        >
                                            @{user.username}
                                        </Link>
                                        {user.bio && (
                                            <Text style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {user.bio}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )
                )}
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

