import { ActivityIndicator, StyleSheet, View } from 'react-native';
export function LoadingScreen() { return <View style={styles.container}><ActivityIndicator color="#2563eb" size="large" /></View>; }
const styles = StyleSheet.create({ container: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center' } });
