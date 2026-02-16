import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '208609136535-ssjkktis9g3n8f11hs46uuf6n2riecen.apps.googleusercontent.com';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthSuccess(response);
    } else if (response?.type === 'error') {
      setIsGoogleLoading(false);
      Alert.alert('Google Sign-In Failed', response.error?.message || 'An error occurred');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authResponse) => {
    try {
      console.log('Full OAuth response:', JSON.stringify(authResponse, null, 2));
      console.log('Response params:', authResponse.params);

      const idToken = authResponse.params?.id_token;
      const nonce = authResponse.params?.nonce;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('ID Token received, authenticating with Supabase...', { hasNonce: !!nonce, nonce });

      const { data, error } = await signInWithGoogle(idToken, nonce);

      console.log('signInWithGoogle result:', { data: !!data, error: error?.message });

      if (error) {
        console.error('Google sign-in error:', error);
        if (error.message !== 'Google sign-in was cancelled') {
          Alert.alert('Google Sign-In Failed', error.message || 'An error occurred. Please try again.');
        }
        return;
      }

      if (data?.user) {
        console.log('Google sign-in successful! User:', data.user.email);
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { screenIndex: 0 } }],
          });
        }, 100);
      } else {
        console.warn('No user data returned from signInWithGoogle');
        Alert.alert('Error', 'Sign-in succeeded but no user data received.');
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signIn(email.trim(), password);

      if (error) {
        let errorMessage = 'Login failed. Please try again.';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email before logging in.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert('Login Failed', errorMessage);
        return;
      }

      console.log('Login successful:', data.user?.email);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home', params: { screenIndex: 0 } }],
      });
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password.');
      return;
    }
    Alert.alert('Reset Password', `A password reset link will be sent to ${email}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send', onPress: () => console.log('Send reset email to:', email) },
    ]);
  };

  const handleGoogleSignIn = async () => {
    if (!request) {
      Alert.alert('Error', 'Google Sign-In is not ready. Please try again.');
      return;
    }

    setIsGoogleLoading(true);

    try {
      await promptAsync();
    } catch (err) {
      console.error('Google login error:', err);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/PickleplayPH.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>PicklePlay</Text>
            <Text style={styles.appTagline}>Master Your Game</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Welcome Back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue your journey</Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <Ionicons name="mail" size={16} color={Colors.lime400} />
                <Text style={styles.inputLabelText}>Email</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.slate400}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <Ionicons name="lock-closed" size={16} color={Colors.lime400} />
                <Text style={styles.inputLabelText}>Password</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.slate400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={Colors.slate500}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity style={styles.forgotPasswordButton} onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.loginButtonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="log-in" size={20} color={Colors.white} />
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* OAuth Buttons */}
            <TouchableOpacity
              style={[styles.oauthButton, styles.googleButton, isGoogleLoading && styles.oauthButtonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.slate950} />
                  <Text style={styles.oauthButtonText}>Signing in...</Text>
                </>
              ) : (
                <>
                  <FontAwesome name="google" size={18} color={Colors.slate950} />
                  <Text style={styles.oauthButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.oauthButton, styles.facebookButton]}>
              <FontAwesome name="facebook" size={18} color={Colors.white} />
              <Text style={[styles.oauthButtonText, { color: Colors.white }]}>Facebook</Text>
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>By signing in, you agree to our</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lime400 + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -1,
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 14,
    color: Colors.slate400,
    letterSpacing: 1,
  },
  formContainer: {
    marginHorizontal: 20,
    paddingVertical: 24,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.slate400,
    marginBottom: 24,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  inputLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.slate300,
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate800 + '80',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.slate700,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: Colors.lime400,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  loginButton: {
    backgroundColor: Colors.lime400,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    shadowColor: Colors.lime400,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.slate700,
  },
  dividerText: {
    color: Colors.slate500,
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  oauthButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  oauthButtonDisabled: {
    opacity: 0.7,
  },
  googleButton: {
    backgroundColor: Colors.white,
    borderColor: Colors.slate200,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
    borderColor: '#1877F2',
  },
  oauthButtonText: {
    color: Colors.slate950,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  signupText: {
    color: Colors.slate400,
    fontSize: 14,
  },
  signupLink: {
    color: Colors.lime400,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.slate700,
    marginHorizontal: 20,
    marginTop: 12,
  },
  footerText: {
    fontSize: 12,
    color: Colors.slate500,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.lime400,
    fontWeight: '700',
  },
});

export default LoginScreen;
