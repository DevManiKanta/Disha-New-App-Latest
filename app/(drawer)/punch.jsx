import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { markAttendance, getAttendanceDetails } from "../../services/api/attendanceService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

export default function PunchScreen() {
  const insets = useSafeAreaInsets();
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [punchInTime, setPunchInTime] = useState(null);
  const [punchOutTime, setPunchOutTime] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);

  const punchButtonScale = useSharedValue(1);

  // Request location permissions on mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        showErrorToast('Location permission is required for attendance tracking');
      }
    } catch (error) {
      showErrorToast('Failed to request location permission');
      setLocationPermission(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Recheck auth when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkAuthStatus();
    }, [])
  );

  const checkAuthStatus = async () => {
    try {
      // Small delay to ensure AsyncStorage is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const token = await AsyncStorage.getItem('authToken');
      setIsAuthenticated(!!token);
      
      if (!token) {
        // No auth token found - user needs to login
      } else {
        // Auth token found - user is authenticated
        
        // If authenticated, fetch current attendance status
        await fetchAttendanceStatus();
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      setIsLoadingStatus(true);
      
      const result = await getAttendanceDetails();
      
      if (result.success && result.data?.attendance) {
        const attendance = result.data.attendance;
        
        setTodayAttendance(attendance);
        
        // Check if user is currently punched in
        const hasPunchIn = attendance.punch_in_time && !attendance.punch_out_time;
        const hasPunchOut = attendance.punch_in_time && attendance.punch_out_time;
        
        setIsPunchedIn(hasPunchIn);
        
        // Set punch times if available
        if (attendance.punch_in_time) {
          const punchInDate = new Date(attendance.punch_in_time);
          if (!isNaN(punchInDate.getTime())) {
            setPunchInTime({
              type: "PUNCH_IN",
              time: punchInDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }),
              timestamp: attendance.punch_in_time,
              address: attendance.punch_in_location?.address || "Location not available",
              date: punchInDate.toLocaleDateString(),
            });
          }
        }
        
        if (attendance.punch_out_time) {
          const punchOutDate = new Date(attendance.punch_out_time);
          if (!isNaN(punchOutDate.getTime())) {
            setPunchOutTime({
              type: "PUNCH_OUT",
              time: punchOutDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              }),
              timestamp: attendance.punch_out_time,
              address: attendance.punch_out_location?.address || "Location not available",
              date: punchOutDate.toLocaleDateString(),
              duration: attendance.total_duration || calculateDuration(attendance.punch_in_time, attendance.punch_out_time),
            });
          }
        }
        
        setAttendanceData(attendance);
        
      } else {
        // No attendance data found for today
        // Reset states if no attendance data
        setIsPunchedIn(false);
        setPunchInTime(null);
        setPunchOutTime(null);
        setTodayAttendance(null);
      }
    } catch (error) {
      showErrorToast("Failed to load attendance status");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get real location from device GPS
  const getRealLocation = async () => {
    try {
      // Check if permission is granted
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        showErrorToast('Location permission denied. Please enable location access.');
        return null;
      }

      // Get current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get address from coordinates (reverse geocoding)
      let address = "Location retrieved";
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode && reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          address = [
            addr.name,
            addr.street,
            addr.city,
            addr.region,
            addr.country
          ].filter(Boolean).join(', ');
        }
      } catch (geoError) {
        // If reverse geocoding fails, use coordinates as address
        address = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        address: address,
      };
    } catch (error) {
      showErrorToast('Failed to get location. Please check your GPS settings.');
      return null;
    }
  };

  const handlePunchIn = async () => {
    // Prevent multiple punch-ins
    if (isPunchedIn) {
      showErrorToast("You are already punched in for today");
      return;
    }

    // Check if user has already punched out today
    if (todayAttendance?.punch_out_time) {
      showErrorToast("You have already completed attendance for today");
      return;
    }

    setIsLoading(true);
    punchButtonScale.value = withSpring(0.95, { damping: 8 });
    setTimeout(() => {
      punchButtonScale.value = withSpring(1, { damping: 8 });
    }, 100);

    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showErrorToast("Please login first to punch in");
        router.push("/(auth)/login");
        return;
      }

      const loc = await getRealLocation();
      
      if (!loc) {
        showErrorToast("Unable to get location. Please enable GPS and try again.");
        setIsLoading(false);
        return;
      }

      // Call API
      const result = await markAttendance(
        loc.latitude,
        loc.longitude,
        loc.address,
        "punch_in"
      );

      if (result.success) {
        const now = new Date();
        const punchData = {
          type: "PUNCH_IN",
          time: now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
          timestamp: now.toISOString(),
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
          date: now.toLocaleDateString(),
        };

        setPunchInTime(punchData);
        setAttendanceData(result.data.data);
        setIsPunchedIn(true);
        setPunchOutTime(null); // Reset punch out time
        
        showSuccessToast(result.message || "Punched in successfully!");
        
        // Refresh attendance status to get updated data
        await fetchAttendanceStatus();
      } else {
        showErrorToast(result.message || "Failed to punch in");
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePunchOut = async () => {
    // Prevent punch out if not punched in
    if (!isPunchedIn) {
      showErrorToast("You need to punch in first");
      return;
    }

    // Check if already punched out
    if (todayAttendance?.punch_out_time) {
      showErrorToast("You have already punched out for today");
      return;
    }

    setIsLoading(true);
    punchButtonScale.value = withSpring(0.95, { damping: 8 });
    setTimeout(() => {
      punchButtonScale.value = withSpring(1, { damping: 8 });
    }, 100);

    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        showErrorToast("Please login first to punch out");
        router.push("/(auth)/login");
        return;
      }

      const loc = await getRealLocation();
      
      if (!loc) {
        showErrorToast("Unable to get location. Please enable GPS and try again.");
        setIsLoading(false);
        return;
      }

      // Call API
      const result = await markAttendance(
        loc.latitude,
        loc.longitude,
        loc.address,
        "punch_out"
      );

      if (result.success) {
        const now = new Date();
        const punchOutData = {
          type: "PUNCH_OUT",
          time: now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }),
          timestamp: now.toISOString(),
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          address: loc.address,
          date: now.toLocaleDateString(),
          punchInTime: punchInTime?.time,
          duration: result.totalHours || calculateDuration(punchInTime?.timestamp, now.toISOString()),
        };

        setPunchOutTime(punchOutData);
        setAttendanceData(result.data.data);
        setIsPunchedIn(false);
        
        showSuccessToast(
          result.message || "Punched out successfully!"
        );
        
        
        // Refresh attendance status to get updated data
        await fetchAttendanceStatus();
      } else {
        showErrorToast(result.message || "Failed to punch out");
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "N/A";
      }
      
      const diff = Math.floor((end - start) / 1000);
      if (diff < 0) return "N/A";
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return "N/A";
    }
  };

  const punchButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: punchButtonScale.value }],
  }));

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 16, 16),
          paddingBottom: Math.max(insets.bottom + 20, 20),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <Animated.View
        style={styles.header}
        entering={FadeInDown.duration(600)}
      >
        <Text style={styles.greeting}>Welcome Back</Text>
        <Text style={styles.title}>Employee Attendance</Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
        
        {/* Authentication Status */}
        {isCheckingAuth ? (
          <View style={styles.authStatus}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.authStatusText}>Checking authentication...</Text>
          </View>
        ) : (
          <>
            <View style={[
              styles.authStatus,
              { backgroundColor: isAuthenticated ? "#ecfdf5" : "#fef2f2" }
            ]}>
              <View style={[
                styles.authDot,
                { backgroundColor: isAuthenticated ? "#10b981" : "#ef4444" }
              ]} />
              <Text style={[
                styles.authStatusText,
                { color: isAuthenticated ? "#10b981" : "#ef4444" }
              ]}>
                {isAuthenticated ? "Authenticated" : "Not Authenticated"}
              </Text>
              {!isAuthenticated && (
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => router.push("/(auth)/login")}
                >
                  <Text style={styles.loginButtonText}>Login</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Location Permission Status */}
            <View style={[
              styles.authStatus,
              { backgroundColor: locationPermission ? "#ecfdf5" : "#fef2f2" }
            ]}>
              <Ionicons 
                name={locationPermission ? "location" : "location-outline"} 
                size={16} 
                color={locationPermission ? "#10b981" : "#ef4444"} 
              />
              <Text style={[
                styles.authStatusText,
                { color: locationPermission ? "#10b981" : "#ef4444" }
              ]}>
                {locationPermission ? "Location Enabled" : "Location Disabled"}
              </Text>
              {!locationPermission && (
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={requestLocationPermission}
                >
                  <Text style={styles.loginButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* CURRENT TIME CARD */}
      <Animated.View
        style={styles.timeCard}
        entering={FadeInUp.duration(600).delay(100)}
      >
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeGradient}
        >
          <Text style={styles.timeLabel}>Current Time</Text>
          <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeSubtitle}>Live Clock</Text>
        </LinearGradient>
      </Animated.View>

      {/* PUNCH IN/OUT SECTION */}
      <Animated.View
        style={styles.punchSection}
        entering={FadeInUp.duration(600).delay(200)}
      >
        <Text style={styles.sectionTitle}>Attendance Status</Text>

        {/* STATUS BADGE */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isPunchedIn ? "#ecfdf5" : "#fef2f2",
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: isPunchedIn ? "#10b981" : "#ef4444",
              },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isPunchedIn ? "#10b981" : "#ef4444",
              },
            ]}
          >
            {isPunchedIn ? "Punched In" : "Punched Out"}
          </Text>
        </View>

        {/* PUNCH BUTTONS SIDE BY SIDE */}
        <View style={styles.punchButtonsRow}>
          <Animated.View
            style={[styles.punchButtonWrapper, punchButtonAnimatedStyle]}
          >
            <TouchableOpacity
              style={[
                styles.punchButton,
                styles.punchInButton,
                (isPunchedIn || isLoading || !isAuthenticated || !locationPermission) && styles.punchButtonDisabled
              ]}
              onPress={handlePunchIn}
              disabled={isPunchedIn || isLoading || !isAuthenticated || !locationPermission}
              activeOpacity={0.85}
            >
              {isLoading && !isPunchedIn ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={32} color="#fff" />
                  <Text style={styles.punchButtonText}>Punch In</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[styles.punchButtonWrapper, punchButtonAnimatedStyle]}
          >
            <TouchableOpacity
              style={[
                styles.punchButton,
                styles.punchOutButton,
                (!isPunchedIn || isLoading || !isAuthenticated || !locationPermission) && styles.punchButtonDisabled
              ]}
              onPress={handlePunchOut}
              disabled={!isPunchedIn || isLoading || !isAuthenticated || !locationPermission}
              activeOpacity={0.85}
            >
              {isLoading && isPunchedIn ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={32} color="#fff" />
                  <Text style={styles.punchButtonText}>Punch Out</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* PUNCH DETAILS */}
        {punchInTime && (
          <Animated.View
            style={styles.detailsCard}
            entering={FadeInUp.duration(600).delay(300)}
          >
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="log-in-outline" size={20} color="#10b981" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Punch In Time</Text>
                <Text style={styles.detailValue}>{punchInTime.time}</Text>
              </View>
            </View>

            {punchOutTime && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Punch Out Time</Text>
                    <Text style={styles.detailValue}>{punchOutTime.time}</Text>
                    {punchOutTime.address && (
                      <Text style={styles.detailSub}>{punchOutTime.address}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Total Duration</Text>
                    <Text style={styles.detailValue}>{punchOutTime.duration}</Text>
                  </View>
                </View>
              </>
            )}

            {attendanceData && attendanceData.attendance_date && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Attendance Date</Text>
                    <Text style={styles.detailValue}>
                      {(() => {
                        try {
                          const date = new Date(attendanceData.attendance_date);
                          return isNaN(date.getTime()) 
                            ? "Date not available" 
                            : date.toLocaleDateString();
                        } catch (error) {
                          return "Date not available";
                        }
                      })()}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        )}
      </Animated.View>

      {/* INFO CARD */}
      <Animated.View
        style={styles.infoCard}
        entering={FadeInUp.duration(600).delay(400)}
      >
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Time and location are recorded for attendance tracking
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  content: {
    paddingHorizontal: 16,
  },

  header: {
    marginBottom: 24,
  },

  greeting: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  date: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },

  authStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },

  authDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  authStatusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  loginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  timeCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 28,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },

  timeGradient: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  timeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginBottom: 8,
  },

  currentTime: {
    fontSize: 48,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 8,
  },

  timeSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "600",
  },

  punchSection: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 16,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },

  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  statusText: {
    fontSize: 14,
    fontWeight: "800",
  },

  punchButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  punchButtonWrapper: {
    flex: 1,
  },

  punchButton: {
    paddingVertical: 24,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },

  punchInButton: {
    backgroundColor: "#10b981",
  },

  punchOutButton: {
    backgroundColor: "#ef4444",
  },

  punchButtonDisabled: {
    opacity: 0.5,
  },

  punchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },

  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "800",
  },

  detailSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },

  infoCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 14,
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  infoText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
    flex: 1,
  },
});
