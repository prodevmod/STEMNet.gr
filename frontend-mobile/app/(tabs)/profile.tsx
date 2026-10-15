import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { Screen } from '@/src/components/Screen';
export default function ProfileScreen() { const { user } = useAuth(); return <Screen contentStyle={styles.container}><View style={styles.avatar}><Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? 'U'}</Text></View><Text style={styles.title}>{user?.username ?? 'Your profile'}</Text><Text style={styles.subtitle}>{user?.email ?? 'Profile details will sync from STEMNet.'}</Text></Screen>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', padding: 24 }, avatar: { alignItems: 'center', backgroundColor: '#dbeafe', borderRadius: 48, height: 96, justifyContent: 'center', width: 96 }, avatarText: { color: '#1d4ed8', fontSize: 36, fontWeight: '800' }, title: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginTop: 18 }, subtitle: { color: '#64748b', marginTop: 8 } });
