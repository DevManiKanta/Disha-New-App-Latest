import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Calendar } from "react-native-calendars";
import { useFocusEffect } from "expo-router";
import { getAttendanceDetails } from "../../services/api/attendanceService";
import { showErrorToast } from "../../utils/toast";

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceData, setAttendanceData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAttendanceData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const result = await getAttendanceDetails();
      
      if (result.success && result.data) {
        // Handle different possible response structures
        let dataArray = [];
        
        if (result.data.data && Array.isArray(result.data.data)) {
          dataArray = result.data.data;
        } else if (Array.isArray(result.data)) {
          dataArray = result.data;
        } else if (result.data.status === true) {
          // API returned success but no data
          setAttendanceData({});
          return;
        }
        
        // Transform API data to match component expectations
        const transformedData = {};
        
        dataArray.forEach((record, index) => {
          // Handle both attendance and appointment date fields
          const date = record.attendance_date || record.appointment_date || record.date;
          
          if (date) {
            // Extract just the date part if it's a full datetime
            const dateOnly = date.split('T')[0];
            
            // Determine status based on available data
            let status = 'absent';
            let label = 'Absent';
            
            if (record.punch_in && record.punch_out) {
              status = 'present';
              label = 'Present';
            } else if (record.punch_in && !record.punch_out) {
              status = 'present';
              label = 'Present (Not punched out)';
            } else if (record.status === 1 || record.status === 'confirmed') {
              // If it's appointment data, treat confirmed appointments as present
              status = 'present';
              label = 'Scheduled';
            }
            
            transformedData[dateOnly] = {
              status,
              label,
              punchIn: record.punch_in,
              punchOut: record.punch_out,
              totalMinutes: record.total_minutes,
              punchInAddress: record.punch_in_address,
              punchOutAddress: record.punch_out_address,
              // Additional fields for appointment data
              appointmentTime: record.appointment_time,
              clientName: record.client_name,
            };
          }
        });
        
        setAttendanceData(transformedData);
        
        // Show success message if we have data
        if (Object.keys(transformedData).length > 0) {
        } else {
        }
      } else {
        
        // For debugging: Add some mock data so you can see the UI working
        const mockData = {
          "2026-05-20": { status: "present", label: "Present", punchIn: "09:00", punchOut: "17:30" },
          "2026-05-21": { status: "present", label: "Present", punchIn: "09:15", punchOut: "17:45" },
          "2026-05-22": { status: "absent", label: "Absent" },
        };
        setAttendanceData(mockData);
        
        showErrorToast(`API Error: ${result.message || "Failed to load attendance data"} (Showing mock data)`);
      }
    } catch (error) {
      
      // For debugging: Add some mock data so you can see the UI working
      const mockData = {
        "2026-05-20": { status: "present", label: "Present", punchIn: "09:00", punchOut: "17:30" },
        "2026-05-21": { status: "present", label: "Present", punchIn: "09:15", punchOut: "17:45" },
        "2026-05-22": { status: "absent", label: "Absent" },
      };
      setAttendanceData(mockData);
      
      showErrorToast(`Network Error: ${error.message} (Showing mock data)`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch attendance data on mount
  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Refresh attendance data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAttendanceData(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAttendanceData(false);
  };

  const getMarkedDates = () => {
    const marked = {};
    Object.keys(attendanceData).forEach((date) => {
      const data = attendanceData[date];
      let color = "#3b82f6";
      let textColor = "#fff";

      if (data.status === "holiday") {
        color = "#f59e0b";
      } else if (data.status === "leave") {
        color = "#8b5cf6";
      } else if (data.status === "absent") {
        color = "#ef4444";
      } else if (data.status === "present") {
        color = "#10b981";
      }

      marked[date] = {
        selected: true,
        selectedColor: color,
        selectedTextColor: textColor,
      };
    });

    // Mark selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: "#3b82f6",
        selectedTextColor: "#fff",
      };
    }

    return marked;
  };

  const getSelectedDateInfo = () => {
    return attendanceData[selectedDate] || { status: "no-data", label: "No Data" };
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "#10b981";
      case "absent":
        return "#ef4444";
      case "leave":
        return "#8b5cf6";
      case "holiday":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return "checkmark-circle";
      case "absent":
        return "close-circle";
      case "leave":
        return "calendar-outline";
      case "holiday":
        return "star";
      default:
        return "help-circle";
    }
  };

  const selectedInfo = getSelectedDateInfo();
  const stats = {
    present: Object.values(attendanceData).filter((d) => d.status === "present")
      .length,
    absent: Object.values(attendanceData).filter((d) => d.status === "absent")
      .length,
    leave: Object.values(attendanceData).filter((d) => d.status === "leave")
      .length,
    holiday: Object.values(attendanceData).filter((d) => d.status === "holiday")
      .length,
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
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={["#3b82f6"]}
          tintColor="#3b82f6"
        />
      }
    >
      {/* HEADER */}
      <Animated.View
        style={styles.header}
        entering={FadeInDown.duration(600)}
      >
        <Text style={styles.greeting}>Attendance</Text>
        <Text style={styles.title}>Your Record</Text>
      </Animated.View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      ) : (
        <>
          {/* STATS CARDS */}
          <Animated.View
            style={styles.statsGrid}
            entering={FadeInUp.duration(600).delay(100)}
          >
            <View style={styles.statCard}>
              <LinearGradient
                colors={["#10b98133", "#10b98108"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={[styles.statIcon, { backgroundColor: "#d1fae5" }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                </View>
                <Text style={styles.statValue}>{stats.present}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#ef444433", "#ef444408"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={[styles.statIcon, { backgroundColor: "#fee2e2" }]}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </View>
                <Text style={styles.statValue}>{stats.absent}</Text>
                <Text style={styles.statLabel}>Absent</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#8b5cf633", "#8b5cf608"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={[styles.statIcon, { backgroundColor: "#ede9fe" }]}>
                  <Ionicons name="calendar-outline" size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.statValue}>{stats.leave}</Text>
                <Text style={styles.statLabel}>Leaves</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#f59e0b33", "#f59e0b08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={[styles.statIcon, { backgroundColor: "#fef3c7" }]}>
                  <Ionicons name="star" size={24} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>{stats.holiday}</Text>
                <Text style={styles.statLabel}>Holidays</Text>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* CALENDAR */}
          <Animated.View
            style={styles.calendarCard}
            entering={FadeInUp.duration(600).delay(200)}
          >
            <Calendar
              current={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={getMarkedDates()}
              theme={{
                backgroundColor: "#fff",
                calendarBackground: "#fff",
                textSectionTitleColor: "#0f172a",
                textSectionTitleDisabledColor: "#94a3b8",
                selectedDayBackgroundColor: "#3b82f6",
                selectedDayTextColor: "#fff",
                todayTextColor: "#3b82f6",
                dayTextColor: "#0f172a",
                textDisabledColor: "#cbd5e1",
                dotColor: "#3b82f6",
                selectedDotColor: "#fff",
                monthTextColor: "#0f172a",
                indicatorColor: "#3b82f6",
                arrowColor: "#3b82f6",
                "stylesheet.calendar.header": {
                  week: {
                    marginTop: 5,
                    marginBottom: 7,
                    flexDirection: "row",
                    justifyContent: "space-between",
                  },
                },
              }}
              style={styles.calendar}
            />
          </Animated.View>

          {/* SELECTED DATE INFO */}
          <Animated.View
            style={styles.selectedDateCard}
            entering={FadeInUp.duration(600).delay(300)}
          >
            <View style={styles.selectedDateHeader}>
              <Text style={styles.selectedDateTitle}>
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(selectedInfo.status) + "15",
                  borderColor: getStatusColor(selectedInfo.status) + "30",
                },
              ]}
            >
              <View
                style={[
                  styles.statusIconBg,
                  { backgroundColor: getStatusColor(selectedInfo.status) + "20" },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(selectedInfo.status)}
                  size={28}
                  color={getStatusColor(selectedInfo.status)}
                />
              </View>
              <View style={styles.statusContent}>
                <Text
                  style={[
                    styles.statusLabel,
                    { color: getStatusColor(selectedInfo.status) },
                  ]}
                >
                  {selectedInfo.label}
                </Text>
                <Text style={styles.statusDescription}>
                  {selectedInfo.status === "present"
                    ? "You were present"
                    : selectedInfo.status === "absent"
                    ? "You were absent"
                    : selectedInfo.status === "leave"
                    ? "Leave approved"
                    : selectedInfo.status === "holiday"
                    ? "Public holiday"
                    : "No record"}
                </Text>
              </View>
            </View>

            {/* DETAILED INFO FOR PRESENT DAYS */}
            {selectedInfo.status === "present" && (selectedInfo.punchIn || selectedInfo.punchOut) && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Attendance Details</Text>
                
                {selectedInfo.punchIn && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="log-in-outline" size={16} color="#10b981" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Punch In</Text>
                      <Text style={styles.detailValue}>{formatTime(selectedInfo.punchIn)}</Text>
                      {selectedInfo.punchInAddress && (
                        <Text style={styles.detailAddress}>{selectedInfo.punchInAddress}</Text>
                      )}
                    </View>
                  </View>
                )}

                {selectedInfo.punchOut && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="log-out-outline" size={16} color="#ef4444" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Punch Out</Text>
                      <Text style={styles.detailValue}>{formatTime(selectedInfo.punchOut)}</Text>
                      {selectedInfo.punchOutAddress && (
                        <Text style={styles.detailAddress}>{selectedInfo.punchOutAddress}</Text>
                      )}
                    </View>
                  </View>
                )}

                {selectedInfo.totalMinutes && (
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="time-outline" size={16} color="#3b82f6" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Total Duration</Text>
                      <Text style={styles.detailValue}>{formatDuration(selectedInfo.totalMinutes)}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </Animated.View>

          {/* LEGEND */}
          <Animated.View
            style={styles.legendCard}
            entering={FadeInUp.duration(600).delay(400)}
          >
            <Text style={styles.legendTitle}>Legend</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#10b981" }]}
                />
                <Text style={styles.legendText}>Present</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#ef4444" }]}
                />
                <Text style={styles.legendText}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#8b5cf6" }]}
                />
                <Text style={styles.legendText}>Leave</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: "#f59e0b" }]}
                />
                <Text style={styles.legendText}>Holiday</Text>
              </View>
            </View>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
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
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },

  statCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
  },

  statGradient: {
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 16,
  },

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  calendar: {
    paddingVertical: 12,
  },

  selectedDateCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  selectedDateHeader: {
    marginBottom: 16,
  },

  selectedDateTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  statusIconBg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  statusContent: {
    flex: 1,
  },

  statusLabel: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },

  statusDescription: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  legendCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  legendTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
  },

  legendItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  legendText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  detailsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  detailsTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 2,
  },

  detailValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },

  detailAddress: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },
});
