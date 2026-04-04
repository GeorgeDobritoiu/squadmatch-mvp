import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-6 py-12 justify-center min-h-full"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View className="items-center mb-8">
            <Image
              source={require('../../assets/images/icon.png')}
              style={{ width: 160, height: 160, borderRadius: 36 }}
              resizeMode="contain"
            />
          </View>

          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-[#0F2027] mb-2">Welcome back</Text>
            <Text className="text-base text-[#5D7A8A]">Sign in to your SquadPlay account</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm font-semibold text-[#0F2027] mb-1.5">Email</Text>
              <TextInput
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-base text-[#0F2027] bg-[#F6F8FA]"
                placeholder="you@example.com"
                placeholderTextColor="#8FA7B4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-[#0F2027] mb-1.5">Password</Text>
              <TextInput
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-base text-[#0F2027] bg-[#F6F8FA]"
                placeholder="••••••••"
                placeholderTextColor="#8FA7B4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
              />
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className="w-full bg-[#22C55E] rounded-xl py-4 items-center mt-2"
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-sm text-[#5D7A8A]">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text className="text-sm font-bold text-[#22C55E]">Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
