import { StyleSheet, Text, TextInput } from 'react-native';
import { Screen } from '@/src/components/Screen';
export default function SearchScreen() { return <Screen contentStyle={styles.container}><Text style={styles.title}>Search STEMNet</Text><TextInput placeholder="Search people, groups, and posts" placeholderTextColor="#64748b" style={styles.input} /><Text style={styles.help}>Search results will appear here.</Text></Screen>; }
const styles = StyleSheet.create({ container: { padding: 16 }, title: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginBottom: 18 }, input: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: 12, borderWidth: 1, color: '#0f172a', padding: 15 }, help: { color: '#64748b', marginTop: 20 } });
