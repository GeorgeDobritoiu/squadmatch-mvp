import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim())                       { setError('Please enter your name.'); return; }
    if (!email.trim())                      { setError('Please enter your email.'); return; }
    if (password.length < 6)               { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm)              { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signUp({ name: name.trim(), email: email.trim().toLowerCase(), password });
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-5xl mb-4">✉️</Text>
        <Text className="text-2xl font-bold text-[#0F2027] mb-2 text-center">Check your email</Text>
        <Text className="text-base text-[#5D7A8A] text-center mb-8">
          We sent a confirmation link to {email}. Click it to activate your account.
        </Text>
        <TouchableOpacity
          className="bg-[#22C55E] rounded-xl px-8 py-4"
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text className="text-white font-bold text-base">Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

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
          {/* Header */}
          <View className="mb-10">
            <Text className="text-3xl font-bold text-[#0F2027] mb-2">Create account</Text>
            <Text className="text-base text-[#5D7A8A]">Join your squad on SquadPlay</Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm font-semibold text-[#0F2027] mb-1.5">Full Name</Text>
              <TextInput
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-base text-[#0F2027] bg-[#F6F8FA]"
                placeholder="Alex Johnson"
                placeholderTextColor="#8FA7B4"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

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
                placeholder="Min. 6 characters"
                placeholderTextColor="#8FA7B4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-[#0F2027] mb-1.5">Confirm Password</Text>
              <TextInput
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-base text-[#0F2027] bg-[#F6F8FA]"
                placeholder="••••••••"
                placeholderTextColor="#8FA7B4"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <Text className="text-sm text-red-600">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              className="w-full bg-[#22C55E] rounded-xl py-4 items-center mt-2"
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-base">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-sm text-[#5D7A8A]">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-sm font-bold text-[#22C55E]">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
