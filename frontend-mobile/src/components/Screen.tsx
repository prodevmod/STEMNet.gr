import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export function Screen({ children, contentStyle }: { children: ReactNode; contentStyle?: StyleProp<ViewStyle> }) { return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView>; }
const styles = StyleSheet.create({ safe: { backgroundColor: '#f8fafc', flex: 1 } });
