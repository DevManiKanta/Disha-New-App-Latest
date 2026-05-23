import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { getDashboardAnalytics } from "../../../services/api/dashboardService";
import { showErrorToast } from "../../../utils/toast";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const result = await getDashboardAnalytics();

      if (result.success && result.data?.data) {
        setDashboardData(result.data.data);
      } else {
        showErrorToast(result.message || "Failed to load dashboard data");
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
    fetchDashboardData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData(false);
  };

  const stats = useMemo(() => {
    if (!dashboardData) {
      return {
        totalClients: 0,
        totalCalls: 0,
        appointmentsToday: 0,
        followupsToday: 0,
        conversionRate: 0,
        clientSatisfaction: 0,
        callsThisMonth: 0,
        pendingFollowups: 0,
      };
    }

    return {
      totalClients: dashboardData.clients || 0,
      totalCalls: dashboardData.total_calls || 0,
      appointmentsToday: dashboardData.appointments_today || 0,
      followupsToday: dashboardData.followups || 0,
      conversionRate: dashboardData.conversion_rate || 0,
      clientSatisfaction: dashboardData.client_satisfaction || 0,
      callsThisMonth: dashboardData.calls_this_month || 0,
      pendingFollowups: dashboardData.pending_followups || 0,
    };
  }, [dashboardData]);

  const recentActivities = useMemo(() => {
    if (!dashboardData?.recent_activities) {
      return [];
    }
    return dashboardData.recent_activities;
  }, [dashboardData]);

  const getActivityIcon = (type) => {
    if (type?.toLowerCase().includes("online")) return "videocam-outline";
    if (type?.toLowerCase().includes("offline")) return "location-outline";
    return "calendar-outline";
  };

  const getActivityColor = (type) => {
    if (type?.toLowerCase().includes("online")) return "#3b82f6";
    if (type?.toLowerCase().includes("offline")) return "#8b5cf6";
    return "#10b981";
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const renderKPICard = (icon, label, value, hint, bgColor, textColor) => (
    <Animated.View
      style={styles.kpiCard}
      entering={FadeInUp.duration(600).delay(100)}
    >
      <LinearGradient
        colors={bgColor}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.kpiGradient}
      >
        <View style={styles.kpiContent}>
          <View style={styles.kpiHeader}>
            <View style={[styles.kpiIconBox, { backgroundColor: textColor }]}>
              <Ionicons name={icon} size={20} color="#fff" />
            </View>
            <Text style={[styles.kpiLabel, { color: textColor }]}>{label}</Text>
          </View>
          <Text style={[styles.kpiValue, { color: textColor }]}>{value}</Text>
          {hint && (
            <Text style={[styles.kpiHint, { color: textColor }]}>
              {hint}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top + 16, 16),
          paddingBottom: Math.max(insets.bottom + 100, 100),
        },
      ]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={["#3b82f6"]}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Header Section */}
      <Animated.View
        style={styles.headerSection}
        entering={FadeInDown.duration(500)}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles" size={16} color="#fff" />
            <Text style={styles.badgeText}>Today</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Here's your performance overview
        </Text>
      </Animated.View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {["overview", ""].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Grid */}
      <View style={styles.gridContainer}>
        {renderKPICard(
          "call-outline",
          "Total Calls",
          stats.totalCalls,
          null,
          ["#3b82f6", "#2563eb"],
          "#fff"
        )}
        {renderKPICard(
          "people-outline",
          "Clients",
          stats.totalClients,
          null,
          ["#10b981", "#059669"],
          "#fff"
        )}
        {renderKPICard(
          "calendar-outline",
          "Appointments",
          stats.appointmentsToday,
          "Today",
          ["#f59e0b", "#d97706"],
          "#fff"
        )}
        {renderKPICard(
          "chatbubble-ellipses-outline",
          "Follow-ups",
          stats.followupsToday,
          "Today",
          ["#8b5cf6", "#7c3aed"],
          "#fff"
        )}
      </View>

      {/* Conversion Rate Card */}
      <Animated.View
        style={styles.conversionCard}
        entering={FadeInUp.duration(600).delay(200)}
      >
        <LinearGradient
          colors={["#1e293b", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.conversionGradient}
        >
          <View style={styles.conversionContent}>
            <View style={styles.conversionLeft}>
              <Text style={styles.conversionLabel}>Conversion Rate</Text>
              <Text style={styles.conversionValue}>{stats.conversionRate}%</Text>
              <Text style={styles.conversionSub}>+5% from last week</Text>
            </View>
            <View style={styles.conversionChart}>
              <View
                style={[
                  styles.chartBar,
                  { height: `${stats.conversionRate}%` },
                ]}
              />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Quick Actions */}
      {/* <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSub}>Manage your workflow</Text>
      </View> */}

      {/* <View style={styles.actionsGrid}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionCard}
          onPress={() => router.push("/(drawer)/(tabs)/add-client")}
        >
          <LinearGradient
            colors={["#3b82f6", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Ionicons name="person-add-outline" size={24} color="#fff" />
            <Text style={styles.actionTitle}>Add Client</Text>
            <Text style={styles.actionSub}>Create new</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionCard}
          onPress={() => router.push("/(drawer)/(tabs)/appointments")}
        >
          <LinearGradient
            colors={["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Ionicons name="calendar-clear-outline" size={24} color="#fff" />
            <Text style={styles.actionTitle}>Appointment</Text>
            <Text style={styles.actionSub}>Schedule</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View> */}

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity onPress={() => router.push("/(drawer)/appointments")}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentActivities.length > 0 ? (
        <View style={styles.activityList}>
          {recentActivities.map((activity, index) => {
            const activityColor = getActivityColor(activity.appointment_type);
            const activityIcon = getActivityIcon(activity.appointment_type);
            
            return (
              <Animated.View
                key={activity.id}
                style={styles.activityItem}
                entering={FadeInUp.duration(500).delay(index * 100)}
              >
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: `${activityColor}20` },
                  ]}
                >
                  <Ionicons
                    name={activityIcon}
                    size={18}
                    color={activityColor}
                  />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityName}>{activity.title}</Text>
                  <Text style={styles.activityAction}>{activity.subtitle}</Text>
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                  {activity.appointment_type && (
                    <View
                      style={[
                        styles.activityBadge,
                        { backgroundColor: `${activityColor}15` },
                      ]}
                    >
                      <Text style={[styles.activityBadgeText, { color: activityColor }]}>
                        {activity.appointment_type}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyActivity}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyActivityText}>No recent activities</Text>
        </View>
      )}

      {/* Footer Stats */}
      <Animated.View
        style={styles.footerStats}
        entering={FadeInUp.duration(600).delay(300)}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.clientSatisfaction}%</Text>
          <Text style={styles.statLabel}>Client Satisfaction</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.callsThisMonth}</Text>
          <Text style={styles.statLabel}>Calls This Month</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.pendingFollowups}</Text>
          <Text style={styles.statLabel}>Pending Follow-ups</Text>
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

  headerSection: {
    marginBottom: 24,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
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

  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
  },

  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  tabContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: "relative",
  },

  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: "#3b82f6",
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
  },

  activeTabText: {
    color: "#0f172a",
    fontWeight: "700",
  },

  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#3b82f6",
    borderRadius: 1.5,
  },

  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  kpiCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  kpiGradient: {
    padding: 16,
  },

  kpiContent: {
    gap: 8,
  },

  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.3,
  },

  kpiLabel: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.8,
  },

  kpiValue: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  kpiHint: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.7,
  },

  conversionCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  conversionGradient: {
    padding: 20,
  },

  conversionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  conversionLeft: {
    flex: 1,
  },

  conversionLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 8,
  },

  conversionValue: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },

  conversionSub: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "600",
    marginTop: 4,
  },

  conversionChart: {
    width: 60,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 8,
  },

  chartBar: {
    width: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },

  sectionSub: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  viewAll: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "700",
  },

  actionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },

  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },

  actionGradient: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  actionSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },

  activityList: {
    gap: 12,
    marginBottom: 24,
  },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  activityContent: {
    flex: 1,
  },

  activityName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },

  activityAction: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  activityMeta: {
    alignItems: "flex-end",
    gap: 6,
  },

  activityTime: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },

  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  activityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  emptyActivity: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  emptyActivityText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "600",
  },

  footerStats: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
  },

  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },
});
