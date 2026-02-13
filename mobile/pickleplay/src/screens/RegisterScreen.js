import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
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

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

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

      const { data, error } = await signInWithGoogle(idToken, nonce);

      if (error) {
        console.error('Google sign-up error:', error);
        if (error.message !== 'Google sign-in was cancelled') {
          Alert.alert('Google Sign-Up Failed', error.message || 'An error occurred. Please try again.');
        }
        return;
      }

      if (data?.user) {
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home', params: { screenIndex: 0 } }],
          });
        }, 100);
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
        firstName,
        lastName,
        phoneNumber,
      });

      if (error) {
        Alert.alert('Sign-Up Failed', error.message || 'An error occurred. Please try again.');
        return;
      }

      if (data?.user) {
        Alert.alert(
          'Verification Required',
          'Please check your email to verify your account before logging in.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const FormInput = ({ label, placeholder, value, onChangeText, icon, secureTextEntry, editable = true, onToggleSecure = null, keyboardType = 'default' }) => (
    <View style={styles.inputWrapper}>
      <View style={styles.inputLabel}>
        <Ionicons name={icon} size={16} color={Colors.lime400} />
        <Text style={styles.inputLabelText}>{label}</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.slate400}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          editable={editable}
          keyboardType={keyboardType}
        />
        {onToggleSecure && (
          <TouchableOpacity onPress={onToggleSecure}>
            <Ionicons
              name={secureTextEntry ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.slate500}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.slate950, Colors.slate900]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Image
              source={require('../assets/PickleplayPH.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Join the adventure</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <FormInput
              label="First Name"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              icon="person"
            />
            <FormInput
              label="Last Name"
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              icon="person-add"
            />
            <FormInput
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              icon="mail"
              keyboardType="email-address"
            />
            <FormInput
              label="Phone (Optional)"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              icon="call"
              keyboardType="phone-pad"
            />
            <FormInput
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed"
              secureTextEntry={!showPassword}
              onToggleSecure={() => setShowPassword(!showPassword)}
            />
            <FormInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon="checkmark-circle"
              secureTextEntry={!showConfirmPassword}
              onToggleSecure={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreeToTerms(!agreeToTerms)}
            >
              <View
                style={[
                  styles.checkbox,
                  agreeToTerms && styles.checkboxActive,
                ]}
              >
                {agreeToTerms && (
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.signUpButtonText}>Creating Account...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add-sharp" size={20} color={Colors.white} />
                  <Text style={styles.signUpButtonText}>Create Account</Text>
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
              onPress={handleGoogleSignUp}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <>
                  <ActivityIndicator size="small" color={Colors.slate950} />
                  <Text style={styles.oauthButtonText}>Signing up...</Text>
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

            {/* Login Link */}
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
  headerSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  headerLogo: {
    width: 50,
    height: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.5,
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.slate400,
    letterSpacing: 0.5,
  },
  formContainer: {
    marginHorizontal: 20,
    paddingBottom: 32,
  },
  inputWrapper: {
    marginBottom: 16,
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
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.slate600,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.lime400,
    borderColor: Colors.lime400,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.slate300,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.lime400,
    fontWeight: '700',
  },
  signUpButton: {
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
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: Colors.slate400,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.lime400,
    fontSize: 14,
    fontWeight: '800',
  },
});

export default RegisterScreen;
