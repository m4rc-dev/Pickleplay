import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

// Required for auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client ID
const GOOGLE_WEB_CLIENT_ID = '208609136535-ssjkktis9g3n8f11hs46uuf6n2riecen.apps.googleusercontent.com';

const thematicBlue = '#0A56A7';
const activeColor = '#a3ff01';

const RegisterScreen = ({ navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  // Set up Google OAuth request using Expo's proxy for development
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleAuthSuccess(response);
    } else if (response?.type === 'error') {
      setIsGoogleLoading(false);
      Alert.alert('Google Sign-Up Failed', response.error?.message || 'An error occurred');
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleAuthSuccess = async (authResponse) => {
    try {
      const idToken = authResponse.params?.id_token;
      const nonce = authResponse.params?.nonce;
      
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('ID Token received, authenticating with Supabase...', { hasNonce: !!nonce });

      const { data, error } = await signInWithGoogle(idToken, nonce);
      
      console.log('signInWithGoogle result:', { data: !!data, error: error?.message });
      
      if (error) {
        console.error('Google sign-up error:', error);
        if (error.message !== 'Google sign-in was cancelled') {
          Alert.alert('Google Sign-Up Failed', error.message || 'An error occurred. Please try again.');
        }
        return;
      }

      if (data?.user) {
        console.log('Google sign-up successful! User:', data.user.email);
        console.log('Navigating to Home...');
        
        // Small delay to ensure state updates
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { screenIndex: 0 } }],
          });
          console.log('Navigation command sent');
        }, 100);
      } else {
        console.warn('No user data returned from signInWithGoogle');
        Alert.alert('Error', 'Sign-up succeeded but no user data received.');
      }
    } catch (err) {
      console.error('Google sign-up error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google sign-up error:', error);
      setIsGoogleLoading(false);
      Alert.alert('Error', 'Failed to start Google sign-up');
    }
  };

  const handleRegister = async () => {
    // Validate inputs
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!agreeToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await signUp(email.trim(), password, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        phone_number: phoneNumber.trim() || null,
      });
      
      if (error) {
        let errorMessage = 'Registration failed. Please try again.';
        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.message.includes('valid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('password')) {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert('Registration Failed', errorMessage);
        return;
      }

      // Check if email confirmation is required
      if (data?.user?.identities?.length === 0) {
        Alert.alert(
          'Email Already Exists',
          'An account with this email already exists. Please login instead.',
          [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
        );
        return;
      }

      // Success - show confirmation message
      Alert.alert(
        'Registration Successful!',
        'Please check your email to verify your account, then login.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      console.error('Registration error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={thematicBlue} />
      
      <LinearGradient
        colors={[thematicBlue, thematicBlue]}
        style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Logo Header Section */}
          <View style={styles.logoHeader}>
            <Image 
              source={require('../assets/PickleplayPH.png')} 
              style={styles.logoImage}
            />
          </View>

          {/* Registration Form */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the pickleball community</Text>

            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="person-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone Number Input (Optional) */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number (optional)"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCorrect={false}
                blurOnSubmit={false}
                returnKeyType="next"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons 
                  name={showPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="rgba(255,255,255,0.7)" 
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="lock-outline" size={20} color="rgba(255,255,255,0.7)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <MaterialIcons 
                  name={showConfirmPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="rgba(255,255,255,0.7)" 
                />
              </TouchableOpacity>
            </View>

            {/* Terms and Conditions */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
            >
              <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                {agreeToTerms && <MaterialIcons name="check" size={16} color={thematicBlue} />}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={thematicBlue} />
                  <Text style={[styles.registerButtonText, { marginLeft: 10 }]}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* OAuth Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* OAuth Buttons */}
            <View style={styles.oauthContainer}>
              <TouchableOpacity 
                style={[styles.googleButton, isGoogleLoading && styles.googleButtonDisabled]}
                onPress={handleGoogleSignUp}
                disabled={!request || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#DB4437" />
                    <Text style={[styles.googleButtonText, { marginLeft: 10 }]}>Signing up...</Text>
                  </View>
                ) : (
                  <>
                    <FontAwesome name="google" size={20} color="#DB4437" style={styles.oauthIcon} />
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.facebookButton}>
                <FontAwesome name="facebook" size={20} color={Colors.white} style={styles.oauthIcon} />
                <Text style={styles.facebookButtonText}>Sign up with Facebook</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
  logoHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 200,
    height: 90,
    resizeMode: 'contain',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 2,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: Colors.white,
    fontSize: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: activeColor,
    borderColor: activeColor,
  },
  termsText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  termsLink: {
    color: activeColor,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: activeColor,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: thematicBlue,
    fontSize: 18,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 15,
    fontSize: 14,
  },
  oauthContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 12,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  oauthIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  facebookButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
  },
  loginText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  loginLink: {
    color: activeColor,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 5,
  },
  roleOptionActive: {
    backgroundColor: activeColor,
    borderColor: activeColor,
  },
  roleOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleOptionTextActive: {
    color: thematicBlue,
  },
});

export default RegisterScreen;
