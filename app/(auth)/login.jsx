import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";

import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { adminLogin } from "../../services/api/authService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const logoScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 8, mass: 1 });
    formOpacity.value = withSpring(1, { damping: 10, mass: 1.2 });
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  const validateForm = () => {
    const newErrors = {};
    
    if (!login.trim()) {
      newErrors.login = "Username or email is required";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({});
    
    // Validate form
    if (!validateForm()) {
      showErrorToast("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await adminLogin(login, password);

      if (result.success) {
        // Show success message
        showSuccessToast(result.message || "Login successful!");
        
        // Navigate to main app immediately (token is already stored in adminLogin)
        router.replace("/(drawer)/punch");
      } else {
        // Handle validation errors
        if (result.validationErrors && Object.keys(result.validationErrors).length > 0) {
          setErrors(result.validationErrors);
          const firstError = Object.values(result.validationErrors)[0];
          showErrorToast(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          showErrorToast(result.message || "Login failed");
        }
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <LinearGradient
        colors={["#0f172a", "#1e293b", "#0f172a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />

        {/* Logo Section */}
        <Animated.View
          style={[styles.logoSection, logoAnimatedStyle]}
          entering={FadeInDown.duration(800)}
        >
          <Image
            source={require("../../assets/images/Disha_NewLogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
            <Text style={styles.tagline}>Employee-Login</Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View
          style={[styles.formSection, formAnimatedStyle]}
          entering={FadeInUp.duration(1000).delay(200)}
        >
          {/* Email/Username Input */}
          <View style={styles.inputWrapper}>
            <View style={[
              styles.inputContainer,
              errors.login && styles.inputError
            ]}>
              <Ionicons
                name="person-outline"
                size={20}
                color={errors.login ? "#ef4444" : "#64748b"}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Username or Email"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={login}
                onChangeText={(text) => {
                  setLogin(text);
                  if (errors.login) {
                    setErrors({ ...errors, login: null });
                  }
                }}
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>
            {errors.login && (
              <Text style={styles.errorText}>{errors.login}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <View style={[
              styles.inputContainer,
              errors.password && styles.inputError
            ]}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={errors.password ? "#ef4444" : "#64748b"}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                disabled={isLoading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password */}
          {/* <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity> */}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonLoading]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          {/* <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View> */}

          {/* Social Login */}
          {/* <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Ionicons name="logo-google" size={24} color="#ea4335" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Ionicons name="logo-apple" size={24} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton} disabled={isLoading}>
              <Ionicons name="logo-microsoft" size={24} color="#00a4ef" />
            </TouchableOpacity>
          </View> */}

          {/* Sign Up Link */}
          {/* <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity disabled={isLoading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View> */}
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  gradient: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 30,
  },

  decorativeCircle1: {
    position: "absolute",
    width: 300,
    height: 500,
    borderRadius: 150,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    top: -100,
    right: -50,
  },

  decorativeCircle2: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    bottom: -80,
    left: -60,
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 60,
  },

  logo: {
    width: 200,
    height: 120,
    marginBottom: 16,
  },

  tagline: {
    fontSize: 20,
    color: "#ecc209ff",
    fontWeight: "500",
    letterSpacing: 0.5,
  },

  formSection: {
    flex: 1,
    justifyContent: "flex-start",
  },

  inputWrapper: {
    marginBottom: 16,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    height: 56,
  },

  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },

  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },

  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },

  forgotPasswordText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },

  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    height: 56,
  },

  loginButtonLoading: {
    opacity: 0.8,
  },

  buttonGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },

  dividerText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 12,
    letterSpacing: 0.3,
  },

  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },

  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  signupText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },

  signupLink: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "700",
  },
});
