import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
 
import Navbar from '../components/Navbar';

export default function Notifications({ currentUser, setCurrentUser, theme, toggleTheme, hasUnreadNotifications, setHasUnreadNotifications }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('https://stemnet.app/api/notifications', { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch notifications');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setNotifications(data);
                    
                    if (data.length > 0) {
                        fetch('https://stemnet.app/api/notifications/read', { credentials: 'include',
method: 'POST', credentials: 'include' })
                            .then(() => {
                                if (setHasUnreadNotifications) {
                                    setHasUnreadNotifications(false);
                                }
                            })
                            .catch(err => console.error('Error marking as read:', err));
                    } else if (setHasUnreadNotifications) {
                        setHasUnreadNotifications(false);
                    }
                } else {
                    setNotifications([]);
                }
            })
            .catch(err => {
                console.error('Error fetching notifications:', err);
                setNotifications([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [setHasUnreadNotifications]);

    return (
        <View>
            <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} hasUnreadNotifications={hasUnreadNotifications} />
            <main className="app-main-container" style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }}>
                <Text style={{ color: '#ccff00' }}>Notifications</Text>
                {loading ? (
                    <View className="card" style={{ textAlign: 'center', padding: '2rem', color: '#ccff00' }}>Loading notifications...</View>
                ) : notifications.length === 0 ? (
                    <View className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No notifications yet.
                    </View>
                ) : (
                    <View style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {notifications.map((notif) => {
                            const hasActor = Boolean(notif.actor_username);
                            const actorLabel = hasActor ? `@${notif.actor_username}` : 'Someone';

                            return (
                                <View 
                                    key={notif.id} 
                                    className="card" 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        background: notif.is_read ? 'var(--card-bg)' : 'var(--border-color)',
                                        padding: '1rem'
                                    }}
                                >
                                    <View style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {hasActor ? (
                                            <Link to={`/profile/${notif.actor_username}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none' }}>
                                                {actorLabel}
                                            </Link>
                                        ) : (
                                            <Text style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                                {actorLabel}
                                            </Text>
                                        )}
                                        <Text style={{ color: 'var(--text-secondary)' }}>
                                            {notif.type === 'like' && 'liked your post.'}
                                            {notif.type === 'reply' && 'replied to your post.'}
                                            {notif.type === 'follow' && 'started following you.'}
                                            {notif.type === 'new_post' && 'created a new post.'}
                                            {notif.type === 'self_post' && 'Your post was successfully published!'}
                                        </Text>
                                    </View>
                                    {notif.post_id && (
                                        <Link to={`/post/${notif.post_id}`} className="btn btn-primary" style={{ fontSize: '0.85rem', textDecoration: 'none', padding: '0.3rem 0.6rem' }}>
                                            View
                                        </Link>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                )}
            </main>
        </View>
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

