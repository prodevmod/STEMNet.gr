import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { Screen } from '@/src/components/Screen';
export default function SettingsScreen() { const { signOut } = useAuth(); return <Screen contentStyle={styles.container}><Text style={styles.title}>Settings</Text><Text style={styles.subtitle}>Manage your STEMNet account.</Text><Pressable onPress={() => void signOut()} style={styles.button}><Text style={styles.buttonText}>Log out</Text></Pressable></Screen>; }
const styles = StyleSheet.create({ container: { padding: 16 }, title: { color: '#0f172a', fontSize: 28, fontWeight: '800' }, subtitle: { color: '#64748b', fontSize: 16, marginTop: 8 }, button: { backgroundColor: '#fee2e2', borderRadius: 12, marginTop: 28, padding: 16 }, buttonText: { color: '#b91c1c', fontSize: 16, fontWeight: '700', textAlign: 'center' } });
