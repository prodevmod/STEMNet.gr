import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/auth/AuthProvider';
import { EmptyState } from '@/src/components/EmptyState';
import { Screen } from '@/src/components/Screen';
type Post = { id: number; username?: string; content?: string; like_count?: number };
export default function HomeScreen() {
  const { user } = useAuth(); const [posts, setPosts] = useState<Post[]>([]); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const loadPosts = useCallback(async () => { setError(''); try { const data = await api.get<{ posts?: Post[] }>('/api/posts?page=1'); setPosts(data.posts ?? []); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load the feed.'); } }, []);
  useFocusEffect(useCallback(() => { void loadPosts(); }, [loadPosts]));
  const refresh = async () => { setRefreshing(true); await loadPosts(); setRefreshing(false); };
  return <Screen><FlatList contentContainerStyle={styles.content} data={posts} keyExtractor={(item) => String(item.id)} ListEmptyComponent={<EmptyState message={error || `Welcome${user?.username ? `, ${user.username}` : ''}. Your feed is ready for the first post.`} />} refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} />} renderItem={({ item }) => <View style={styles.card}><Text style={styles.author}>{item.username ?? 'STEMNet member'}</Text><Text style={styles.post}>{item.content ?? ''}</Text><Text style={styles.meta}>{item.like_count ?? 0} likes</Text></View>} /></Screen>;
}
const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 16 }, card: { backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 16 }, author: { color: '#0f172a', fontSize: 16, fontWeight: '700' }, post: { color: '#334155', fontSize: 16, lineHeight: 24, marginTop: 10 }, meta: { color: '#64748b', fontSize: 13, marginTop: 14 } });
