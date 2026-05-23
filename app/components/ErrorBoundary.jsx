import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  BounceIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and any crash reporting service
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error);
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      // Wait a moment for visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset error state
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        isRetrying: false,
      });
    } catch (retryError) {
      this.setState({ isRetrying: false });
    }
  };

  handleReload = async () => {
    try {
      // Navigate to home screen as a fallback
      router.replace('/');
    } catch (reloadError) {
      // Reset error state as last resort
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorScreen
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          isRetrying={this.state.isRetrying}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorScreen = ({ error, errorInfo, onRetry, onReload, isRetrying }) => {
  const insets = useSafeAreaInsets();
  const pulseScale = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  React.useEffect(() => {
    // Pulse animation for the error icon
    pulseScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );

    // Rotate animation for retry button when retrying
    if (isRetrying) {
      rotateValue.value = withRepeat(
        withSpring(360, { damping: 8 }),
        -1,
        false
      );
    } else {
      rotateValue.value = withSpring(0);
    }
  }, [isRetrying]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  const getErrorMessage = () => {
    if (error?.message) {
      // Clean up common error messages
      if (error.message.includes('Network')) {
        return 'Network connection issue detected';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out';
      }
      if (error.message.includes('JSON')) {
        return 'Data parsing error occurred';
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  };

  const getErrorCode = () => {
    if (error?.code) return error.code;
    if (error?.status) return `HTTP ${error.status}`;
    return 'ERR_UNKNOWN';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#ef4444" />
      
      <LinearGradient
        colors={['#ef4444', '#dc2626', '#b91c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ERROR ICON */}
          <Animated.View 
            style={[styles.iconContainer, pulseStyle]}
            entering={BounceIn.duration(800)}
          >
            <View style={styles.iconBackground}>
              <Ionicons name="warning" size={64} color="#fff" />
            </View>
          </Animated.View>

          {/* ERROR MESSAGE */}
          <Animated.View 
            style={styles.messageContainer}
            entering={FadeInUp.duration(600).delay(200)}
          >
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              We encountered an unexpected error. Don't worry, we're here to help you get back on track.
            </Text>
            
            <View style={styles.errorDetails}>
              <Text style={styles.errorMessage}>{getErrorMessage()}</Text>
              <Text style={styles.errorCode}>Error Code: {getErrorCode()}</Text>
            </View>
          </Animated.View>

          {/* ACTION BUTTONS */}
          <Animated.View 
            style={styles.actionsContainer}
            entering={FadeInUp.duration(600).delay(400)}
          >
            <TouchableOpacity
              style={[styles.primaryButton, isRetrying && styles.buttonDisabled]}
              onPress={onRetry}
              disabled={isRetrying}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isRetrying ? ['#94a3b8', '#64748b'] : ['#fff', '#f8fafc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Animated.View style={[styles.buttonContent, isRetrying && rotateStyle]}>
                  <Ionicons 
                    name={isRetrying ? "refresh" : "refresh-outline"} 
                    size={20} 
                    color={isRetrying ? "#fff" : "#ef4444"} 
                  />
                </Animated.View>
                <Text style={[styles.primaryButtonText, isRetrying && { color: '#fff' }]}>
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onReload}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={20} color="#fff" />
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* HELP SECTION */}
          <Animated.View 
            style={styles.helpSection}
            entering={FadeInDown.duration(600).delay(600)}
          >
            <View style={styles.helpCard}>
              <View style={styles.helpHeader}>
                <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.helpTitle}>Need Help?</Text>
              </View>
              <Text style={styles.helpText}>
                If this problem persists, please contact our support team with the error code above.
              </Text>
              <View style={styles.helpActions}>
                <TouchableOpacity style={styles.helpButton}>
                  <Ionicons name="mail-outline" size={16} color="#3b82f6" />
                  <Text style={styles.helpButtonText}>Contact Support</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.helpButton}>
                  <Ionicons name="document-text-outline" size={16} color="#3b82f6" />
                  <Text style={styles.helpButtonText}>View Logs</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* DEBUG INFO (Development only) */}
          {__DEV__ && error && (
            <Animated.View 
              style={styles.debugSection}
              entering={FadeInUp.duration(600).delay(800)}
            >
              <Text style={styles.debugTitle}>Debug Information</Text>
              <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                <Text style={styles.debugText}>
                  {error.toString()}
                  {errorInfo?.componentStack && `\n\nComponent Stack:${errorInfo.componentStack}`}
                </Text>
              </ScrollView>
            </Animated.View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  gradient: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  iconContainer: {
    marginBottom: 32,
  },

  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: '500',
  },

  errorDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  errorMessage: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  errorCode: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'monospace',
  },

  actionsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },

  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },

  buttonContent: {
    // For rotation animation
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 12,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  helpSection: {
    width: '100%',
    marginBottom: 24,
  },

  helpCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  helpTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },

  helpText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },

  helpActions: {
    flexDirection: 'row',
    gap: 12,
  },

  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },

  helpButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },

  debugSection: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  debugTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },

  debugScroll: {
    maxHeight: 200,
  },

  debugText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default ErrorBoundary;