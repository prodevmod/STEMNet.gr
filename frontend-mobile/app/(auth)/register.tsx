import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/src/components/Screen';
export default function RegisterScreen() {
  return <Screen contentStyle={styles.container}><Text style={styles.title}>Create your STEMNet account</Text><Text style={styles.body}>Account registration remains available on the web app while the mobile registration form is migrated.</Text><Link href="/(auth)/login" style={styles.link}>Back to login</Link></Screen>;
}
const styles = StyleSheet.create({ container: { justifyContent: 'center', padding: 24 }, title: { color: '#0f172a', fontSize: 28, fontWeight: '800' }, body: { color: '#64748b', fontSize: 16, lineHeight: 24, marginTop: 14 }, link: { color: '#2563eb', fontSize: 16, marginTop: 24 } });
