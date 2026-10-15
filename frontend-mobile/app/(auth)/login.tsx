import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { useAuth } from '@/src/auth/AuthProvider';
import { Screen } from '@/src/components/Screen';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async () => {
    setError(''); setIsSubmitting(true);
    try { await signIn(identifier.trim(), password); router.replace('/(tabs)'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to log in.'); }
    finally { setIsSubmitting(false); }
  };
  return <Screen contentStyle={styles.container}>
    <Text style={styles.brand}>STEMNet</Text><Text style={styles.title}>Welcome back</Text>
    <Text style={styles.subtitle}>Connect with the STEM community.</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setIdentifier} placeholder="Username or email" placeholderTextColor="#64748b" style={styles.input} value={identifier} />
    <TextInput autoCapitalize="none" onChangeText={setPassword} placeholder="Password" placeholderTextColor="#64748b" secureTextEntry style={styles.input} value={password} />
    <Pressable disabled={isSubmitting || !identifier || !password} onPress={submit} style={styles.button}><Text style={styles.buttonText}>{isSubmitting ? 'Logging in...' : 'Log in'}</Text></Pressable>
    <Link href="/(auth)/register" style={styles.link}>Create an account</Link>
  </Screen>;
}
const styles = StyleSheet.create({
  container: { justifyContent: 'center', padding: 24 }, brand: { color: '#2563eb', fontSize: 20, fontWeight: '800', marginBottom: 28 },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '800' }, subtitle: { color: '#64748b', fontSize: 16, marginBottom: 28, marginTop: 8 },
  error: { color: '#b91c1c', marginBottom: 16 }, input: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderRadius: 12, borderWidth: 1, color: '#0f172a', marginBottom: 14, padding: 15 },
  button: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12, marginTop: 4, padding: 16 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#2563eb', fontSize: 15, marginTop: 22, textAlign: 'center' }
});
