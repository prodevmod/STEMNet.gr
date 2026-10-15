import { Redirect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthProvider';
import { LoadingScreen } from '@/src/components/LoadingScreen';

export default function Index() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
