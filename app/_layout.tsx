import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

function AuthGate() {
  useAuth(); // bootstraps session listener

  const { session, loading } = useAuthStore();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, segments]);

  return null;
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)"       options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"       options={{ headerShown: false }} />
        <Stack.Screen name="index"        options={{ headerShown: false }} />
        <Stack.Screen name="welcome"      options={{ headerShown: false }} />
        <Stack.Screen name="match/[id]"   options={{ headerShown: false }} />
        <Stack.Screen name="teams/[id]"   options={{ headerShown: false }} />
        <Stack.Screen name="motm/[id]"    options={{ headerShown: false }} />
        <Stack.Screen name="history"      options={{ headerShown: false }} />
        <Stack.Screen name="player/[id]"  options={{ headerShown: false }} />
        <Stack.Screen name="schedule"     options={{ headerShown: false }} />
        <Stack.Screen name="calendar"     options={{ headerShown: false }} />
        <Stack.Screen name="create-team"  options={{ headerShown: false }} />
        <Stack.Screen name="create-group" options={{ headerShown: false }} />
        <Stack.Screen name="group-invite" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found"   />
      </Stack>
      <StatusBar style="dark" />
    </QueryClientProvider>
  );
}
