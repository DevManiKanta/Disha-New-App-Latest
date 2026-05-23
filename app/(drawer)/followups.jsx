import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { getFollowupList } from "../../services/api/followupService";
import { showErrorToast } from "../../utils/toast";

export default function FollowupsScreen() {
  const insets = useSafeAreaInsets();
  const [followups, setFollowups] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({});

  const FILTERS = ["All", "Today", "This Week", "Pending"];

  const fetchFollowupData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const result = await getFollowupList();
      
      if (result.success && result.data?.data) {
        // Transform API data to match component expectations
        const transformedFollowups = result.data.data.map((followup, index) => {
          
          return {
            id: followup.id.toString(),
            clientName: followup.client?.name || 'Unknown Client',
            clientPhone: followup.client?.phone || '',
            clientId: followup.client?.id || '',
            followupDate: followup.followup_date || '',
            followupDay: followup.followup_day || '',
            followupTime: followup.followup_time || '',
            message: followup.remarks || '',
            status: followup.status_text || 'Pending',
            statusValue: followup.status || '',
            addedBy: followup.added_by || null,
            actions: followup.actions || { call: true, message: true, schedule: true },
            timestamp: followup.followup_date ? new Date(followup.followup_date).toLocaleDateString() : 'Unknown',
            date: followup.followup_date ? new Date(followup.followup_date) : new Date(),
          };
        });
        
        setFollowups(transformedFollowups);
        setCounts(result.data.counts || {});
        setPagination(result.data.pagination || {});
        
        if (transformedFollowups.length > 0) {
        } else {
        }
      } else {
        setFollowups([]);
        setCounts({});
        setPagination({});
        showErrorToast(result.message || "Failed to load followup data");
      }
    } catch (error) {
      setFollowups([]);
      setCounts({});
      setPagination({});
      showErrorToast("An unexpected error occurred");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch followup data on mount
  useEffect(() => {
    fetchFollowupData();
  }, []);

  // Refresh followup data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchFollowupData(false);
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchFollowupData(false);
  };

  const filteredFollowups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return followups.filter((item) => {
      if (selectedFilter === "All") return true;
      if (selectedFilter === "Today") {
        const itemDate = new Date(
          item.date.getFullYear(),
          item.date.getMonth(),
          item.date.getDate()
        );
        return itemDate.getTime() === today.getTime();
      }
      if (selectedFilter === "This Week") {
        return item.date >= weekAgo;
      }
      if (selectedFilter === "Pending") {
        return item.status === 'Pending' || item.status === 'pending';
      }
      return true;
    });
  }, [followups, selectedFilter]);

  const getStatusColor = (status) => {
    if (status === "Completed" || status === "completed") return "#10b981";
    if (status === "Pending" || status === "pending") return "#f59e0b";
    if (status === "Cancelled" || status === "cancelled") return "#ef4444";
    return "#8b5cf6";
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top + 12, 12) },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
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
          entering={FadeInDown.duration(600)}
          layout={Layout.springify()}
          style={styles.header}
        >
          <Text style={styles.title}>Follow-ups</Text>
          <Text style={styles.subtitle}>
            {filteredFollowups.length} follow-up{filteredFollowups.length === 1 ? "" : "s"}
          </Text>
        </Animated.View>

        {/* SUMMARY CARDS */}
        {counts && Object.keys(counts).length > 0 && (
          <Animated.View
            entering={FadeInUp.duration(600).delay(50)}
            style={styles.summaryContainer}
          >
            <Text style={styles.summaryTitle}>Follow-up Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: "#ecfdf5" }]}>
                <Text style={[styles.summaryValue, { color: "#10b981" }]}>{counts.all || 0}</Text>
                <Text style={styles.summaryLabel}>All</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={[styles.summaryValue, { color: "#3b82f6" }]}>{counts.today || 0}</Text>
                <Text style={styles.summaryLabel}>Today</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#fef3c7" }]}>
                <Text style={[styles.summaryValue, { color: "#f59e0b" }]}>{counts.this_week || 0}</Text>
                <Text style={styles.summaryLabel}>This Week</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: "#fef2f2" }]}>
                <Text style={[styles.summaryValue, { color: "#ef4444" }]}>{counts.pending || 0}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* FILTERS */}
        {/* <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          layout={Layout.springify()}
          style={styles.filterContainer}
        >
          {FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View> */}

        {/* LOADING STATE */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading followup data...</Text>
          </View>
        ) : (
          <>
            {/* FOLLOWUPS LIST */}
            {filteredFollowups.length > 0 ? (
              <FlatList
                data={filteredFollowups}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item, index }) => {
                  const statusColor = getStatusColor(item.status);
                  
                  return (
                    <Animated.View
                      entering={FadeInUp.duration(600).delay(index * 100)}
                      layout={Layout.springify()}
                      style={styles.followupCard}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.clientInfo}>
                          <View style={[styles.avatar, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
                            <Text style={[styles.avatarText, { color: statusColor }]}>
                              {item.clientName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.clientDetails}>
                            <Text style={styles.clientName}>{item.clientName}</Text>
                            <Text style={styles.timestamp}>
                              {item.followupDay && item.followupTime 
                                ? `${item.followupDay} at ${item.followupTime}`
                                : item.timestamp
                              }
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                        </View>
                      </View>

                      <View style={styles.messageContainer}>
                        <Text style={styles.message}>{item.message}</Text>
                      </View>

                      {/* CLIENT INFO */}
                      {item.clientPhone && (
                        <View style={styles.clientInfoContainer}>
                          <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={14} color="#64748b" />
                            <Text style={styles.infoText}>{item.clientPhone}</Text>
                          </View>
                          {item.addedBy && (
                            <View style={styles.infoRow}>
                              <Ionicons name="person-outline" size={14} color="#64748b" />
                              <Text style={styles.infoText}>Added by {item.addedBy.name}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        {item.actions?.call && (
                          <TouchableOpacity 
                            style={styles.actionButton} 
                            activeOpacity={0.7}
                            onPress={() => {
                              if (item.clientPhone) {
                                const phoneUrl = `tel:${item.clientPhone}`;
                                Linking.openURL(phoneUrl);
                              }
                            }}
                          >
                            <Ionicons name="call-outline" size={16} color="#3b82f6" />
                            <Text style={styles.actionText}>Call</Text>
                          </TouchableOpacity>
                        )}
                        {item.actions?.message && (
                          <TouchableOpacity 
                            style={styles.actionButton} 
                            activeOpacity={0.7}
                            onPress={() => {
                              if (item.clientPhone) {
                                const whatsappUrl = `https://wa.me/${item.clientPhone.replace(/\D/g, '')}`;
                                Linking.openURL(whatsappUrl);
                              }
                            }}
                          >
                            <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                            <Text style={styles.actionText}>Message</Text>
                          </TouchableOpacity>
                        )}
                        {item.actions?.schedule && (
                          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                            <Ionicons name="calendar-outline" size={16} color="#3b82f6" />
                            <Text style={styles.actionText}>Schedule</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Animated.View>
                  );
                }}
                contentContainerStyle={styles.listContent}
              />
            ) : (
              <Animated.View
                entering={FadeInUp.duration(600)}
                style={styles.emptyState}
              >
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>No Follow-ups</Text>
                <Text style={styles.emptySubtitle}>
                  No follow-ups found for the selected filter
                </Text>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
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

  summaryContainer: {
    marginBottom: 20,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: "row",
    gap: 8,
  },

  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },

  summaryLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  header: {
    marginBottom: 20,
    marginTop: 8,
  },

  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 6,
  },

  filterContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  filterButtonActive: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },

  filterTextActive: {
    color: "#fff",
  },

  listContent: {
    gap: 12,
  },

  followupCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  clientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#3b82f6",
  },

  clientDetails: {
    flex: 1,
  },

  clientName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },

  timestamp: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
  },

  clientInfoContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },

  infoText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    flex: 1,
  },

  messageContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  message: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    lineHeight: 18,
  },

  cardFooter: {
    flexDirection: "row",
    gap: 8,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3b82f6",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },

  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
});
