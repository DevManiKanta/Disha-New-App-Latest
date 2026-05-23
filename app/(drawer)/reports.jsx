import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
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
import Animated, { FadeInUp } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { getDashboardAnalytics } from "../../services/api/dashboardService";
import { showErrorToast } from "../../utils/toast";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("thisMonth");

  const periods = [
    { key: "today", label: "Today" },
    { key: "thisWeek", label: "This Week" },
    { key: "thisMonth", label: "This Month" },
    { key: "thisYear", label: "This Year" },
  ];

  const fetchReportData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const result = await getDashboardAnalytics();

      if (result.success && result.data?.data) {
        setReportData(result.data.data);
      } else {
        showErrorToast(result.message || "Failed to load report data");
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchReportData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchReportData(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchReportData(false);
  };

  const getReportStats = () => {
    if (!reportData) {
      return {
        totalClients: 0,
        totalCalls: 0,
        totalAppointments: 0,
        totalFollowups: 0,
        conversionRate: 0,
        clientSatisfaction: 0,
      };
    }

    return {
      totalClients: reportData.clients || 0,
      totalCalls: reportData.total_calls || 0,
      totalAppointments: reportData.appointments_today || 0,
      totalFollowups: reportData.followups || 0,
      conversionRate: reportData.conversion_rate || 0,
      clientSatisfaction: reportData.client_satisfaction || 0,
    };
  };

  const stats = getReportStats();

  const renderReportCard = (icon, title, value, subtitle, bgColor, textColor) => (
    <Animated.View
      style={styles.reportCard}
      entering={FadeInUp.duration(600).delay(100)}
    >
      <LinearGradient
        colors={bgColor}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: textColor }]}>
              <Ionicons name={icon} size={20} color="#fff" />
            </View>
            <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
          </View>
          <Text style={[styles.cardValue, { color: textColor }]}>{value}</Text>
          {subtitle && (
            <Text style={[styles.cardSubtitle, { color: textColor }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

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
      {/* Header */}
      <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
        <Text style={styles.greeting}>Analytics</Text>
        <Text style={styles.title}>Business Reports</Text>
        <Text style={styles.subtitle}>Track your performance metrics</Text>
      </Animated.View>

      {/* Period Filter */}
      <View style={styles.periodContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.periodRow}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.key && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.periodText,
                    selectedPeriod === period.key && styles.periodTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Report Cards Grid */}
      <View style={styles.gridContainer}>
        {renderReportCard(
          "people-outline",
          "Total Clients",
          stats.totalClients,
          "All time",
          ["#10b981", "#059669"],
          "#fff"
        )}
        {renderReportCard(
          "call-outline",
          "Total Calls",
          stats.totalCalls,
          "All time",
          ["#3b82f6", "#2563eb"],
          "#fff"
        )}
        {renderReportCard(
          "calendar-outline",
          "Appointments",
          stats.totalAppointments,
          "Today",
          ["#f59e0b", "#d97706"],
          "#fff"
        )}
        {renderReportCard(
          "chatbubbles-outline",
          "Follow-ups",
          stats.totalFollowups,
          "Pending",
          ["#8b5cf6", "#7c3aed"],
          "#fff"
        )}
      </View>

      {/* Performance Metrics */}
      <Animated.View
        style={styles.metricsCard}
        entering={FadeInUp.duration(600).delay(200)}
      >
        <LinearGradient
          colors={["#1e293b", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.metricsGradient}
        >
          <Text style={styles.metricsTitle}>Performance Metrics</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{stats.conversionRate}%</Text>
              <Text style={styles.metricLabel}>Conversion Rate</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{stats.clientSatisfaction}%</Text>
              <Text style={styles.metricLabel}>Client Satisfaction</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Summary Section */}
      <Animated.View
        style={styles.summaryCard}
        entering={FadeInUp.duration(600).delay(300)}
      >
        <View style={styles.summaryHeader}>
          <Ionicons name="analytics-outline" size={24} color="#3b82f6" />
          <Text style={styles.summaryTitle}>Summary</Text>
        </View>
        
        <View style={styles.summaryContent}>
          <Text style={styles.summaryText}>
            Your business is performing well with {stats.totalClients} total clients 
            and {stats.totalCalls} calls made. Keep up the great work!
          </Text>
          
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {stats.totalAppointments + stats.totalFollowups}
              </Text>
              <Text style={styles.summaryStatLabel}>Active Tasks</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {Math.round((stats.totalAppointments / Math.max(stats.totalClients, 1)) * 100)}%
              </Text>
              <Text style={styles.summaryStatLabel}>Engagement Rate</Text>
            </View>
          </View>
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

  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  periodContainer: {
    marginBottom: 20,
  },

  periodRow: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16,
  },

  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  periodButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },

  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },

  periodTextActive: {
    color: "#fff",
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  reportCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  cardGradient: {
    padding: 16,
  },

  cardContent: {
    gap: 8,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.3,
  },

  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },

  cardValue: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  cardSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },

  metricsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  metricsGradient: {
    padding: 20,
  },

  metricsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 16,
  },

  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metricItem: {
    flex: 1,
    alignItems: "center",
  },

  metricValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
  },

  metricLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },

  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 20,
  },

  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },

  summaryContent: {
    gap: 16,
  },

  summaryText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 20,
  },

  summaryStats: {
    flexDirection: "row",
    gap: 20,
  },

  summaryStatItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  summaryStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },

  summaryStatLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
  },
});