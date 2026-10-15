import { StyleSheet, Text, View } from 'react-native';
export function EmptyState({ message }: { message: string }) { return <View style={styles.container}><Text style={styles.message}>{message}</Text></View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 260, padding: 24 }, message: { color: '#64748b', fontSize: 16, lineHeight: 24, textAlign: 'center' } });
