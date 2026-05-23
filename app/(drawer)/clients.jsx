import {
    Animated,
    FlatList,
    LayoutAnimation,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
  
  import { Ionicons } from "@expo/vector-icons";
  
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { useSafeAreaInsets } from "react-native-safe-area-context";
  import { CalendarList } from "react-native-calendars";
  import { router, useFocusEffect } from "expo-router";
  import { getClients } from "../../services/api/clientService";
  import { showErrorToast } from "../../utils/toast";
  import AddAppointmentSheet from "../components/AddAppointmentSheet";
  
  export default function ClientsScreen() {
    const insets = useSafeAreaInsets();
    const addAppointmentSheetRef = useRef(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedDateFilter, setSelectedDateFilter] = useState("All");
    const [selectedLeadFilter, setSelectedLeadFilter] = useState("All");
    const [customFromDate, setCustomFromDate] = useState(""); // YYYY-MM-DD
    const [customToDate, setCustomToDate] = useState(""); // YYYY-MM-DD
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isSelectingFromDate, setIsSelectingFromDate] = useState(true);
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [apiCounts, setApiCounts] = useState({});
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
  
    const DATE_FILTERS = ["All", "Today", "Yesterday", "This Week", "Custom"];
    const LEAD_FILTERS = ["All", "Cold", "Warm", "Hot"];

    const fetchClients = async (showLoader = true, page = 1, append = false) => {
      if (showLoader && !append) {
        setIsLoading(true);
      }
      
      if (append) {
        setIsLoadingMore(true);
      }

      try {
        // Build API parameters
        const params = {
          page: page,
          per_page: 10,
        };
        
        // Add date filter
        if (selectedDateFilter !== "All") {
          if (selectedDateFilter === "Custom") {
            if (customFromDate && customToDate) {
              params.date_filter = "custom";
              params.from_date = customFromDate;
              params.to_date = customToDate;
            }
          } else {
            params.date_filter = selectedDateFilter.toLowerCase().replace(" ", "_");
          }
        }
        
        // Add lead filter
        if (selectedLeadFilter !== "All") {
          params.lead_type = selectedLeadFilter.toLowerCase();
        }

        const result = await getClients(params);

        if (result.success && result.data?.data) {
          if (append) {
            setClients(prev => [...prev, ...result.data.data]);
          } else {
            setClients(result.data.data);
          }
          
          // Handle pagination - check multiple possible response structures
          const paginationData = result.pagination || result.data.pagination || null;
          setPagination(paginationData);
          
          // Update counts from API response
          if (result.counts || result.data.counts) {
            setApiCounts(result.counts || result.data.counts);
          }
        } else {
          showErrorToast(result.message || "Failed to load clients");
          if (!append) {
            setClients([]);
            setPagination(null);
          }
        }
      } catch (error) {
        showErrorToast("An unexpected error occurred");
        if (!append) {
          setClients([]);
          setPagination(null);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    };

    // Fetch data on mount and when filters change
    useEffect(() => {
      setCurrentPage(1);
      fetchClients(true, 1, false);
    }, [selectedDateFilter, selectedLeadFilter, customFromDate, customToDate]);

    // Refresh data when screen comes into focus
    useFocusEffect(
      useCallback(() => {
        setCurrentPage(1);
        fetchClients(false, 1, false);
      }, [])
    );

    const onRefresh = () => {
      setIsRefreshing(true);
      setCurrentPage(1);
      fetchClients(false, 1, false);
    };
    
    const loadMore = () => {
      if (pagination && pagination.current_page < pagination.last_page && !isLoadingMore) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchClients(false, nextPage, true);
      }
    };

    const handleAppointmentSaved = () => {
      // Refresh the clients list and close the sheet
      fetchClients(false);
      setSelectedClient(null);
    };

    const parseYmd = useCallback((value) => {
      // Accepts YYYY-MM-DD; returns Date at local midnight or null
      const v = String(value || "").trim();
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      if (!m) return null;
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      const dt = new Date(y, mo - 1, d);
      // basic validity (e.g. 2026-02-31)
      if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
      return dt;
    }, []);

    const getItemDate = useCallback((item) => {
      // Use created_date from API response
      if (item?.created_date) {
        // API returns formatted date like "23 May 2026"
        // Try to parse it properly
        const dateStr = item.created_date;
        
        // Try parsing as-is first
        let date = new Date(dateStr);
        
        // If invalid, try to parse the formatted date
        if (isNaN(date.getTime())) {
          // Try parsing "DD MMM YYYY" format
          const months = {
            'jan': 0, 'january': 0,
            'feb': 1, 'february': 1,
            'mar': 2, 'march': 2,
            'apr': 3, 'april': 3,
            'may': 4,
            'jun': 5, 'june': 5,
            'jul': 6, 'july': 6,
            'aug': 7, 'august': 7,
            'sep': 8, 'september': 8,
            'oct': 9, 'october': 9,
            'nov': 10, 'november': 10,
            'dec': 11, 'december': 11
          };
          
          const parts = dateStr.trim().split(/\s+/);
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const monthStr = parts[1].toLowerCase();
            const year = parseInt(parts[2]);
            const month = months[monthStr];
            
            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
              date = new Date(year, month, day);
            }
          }
        }
        
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    }, []);
  
    const filteredData = useMemo(() => {
      // Since API handles date and lead filtering, we only need to filter by search query
      return clients.filter((item) => {
        // Search filter
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase().trim();
        const searchableText = [
          item.fullname || '',
          item.phone || '',
          item.location || '',
          item.case_type || '',
          item.referance || '',
          item.lead_type || '',
          item.call_type || '',
          item.remarks || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(query);
      });
    }, [clients, searchQuery]);

    const dateCounts = useMemo(() => {
      // Use API counts if available
      if (apiCounts && Object.keys(apiCounts).length > 0) {
        return {
          All: apiCounts.all || 0,
          Today: apiCounts.today || 0,
          Yesterday: apiCounts.yesterday || 0,
          "This Week": apiCounts.this_week || 0,
          Custom: apiCounts.custom || 0,
        };
      }
      
      // Fallback counts
      return {
        All: clients.length,
        Today: 0,
        Yesterday: 0,
        "This Week": 0,
        Custom: 0,
      };
    }, [apiCounts, clients.length]);

    const leadCounts = useMemo(() => {
      // Use API counts if available for lead types
      if (apiCounts && Object.keys(apiCounts).length > 0) {
        return {
          All: apiCounts.all || 0,
          Cold: apiCounts.cold || 0,
          Warm: apiCounts.warm || 0,
          Hot: apiCounts.hot || 0,
        };
      }
      
      // Fallback counts
      return {
        All: clients.length,
        Cold: 0,
        Warm: 0,
        Hot: 0,
      };
    }, [apiCounts, clients.length]);
  
    const getLeadColor = (lead) => {
      if (lead === "Hot") return "#ef4444";
      if (lead === "Warm") return "#f59e0b";
      return "#06b6d4";
    };

    const topPadding = useMemo(() => {
      // removes the "big gap" while staying safe under the notch/status bar
      return Math.max(insets.top + 12, 12);
    }, [insets.top]);

    const screenAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (Platform.OS === "android") {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
      }
      Animated.timing(screenAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }).start();
    }, [screenAnim]);
  
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <Animated.View
          style={{
            opacity: screenAnim,
            transform: [
              {
                translateY: screenAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Clients</Text>
            <Text style={styles.subtitle}>
              {searchQuery.trim() 
                ? `${filteredData.length} result${filteredData.length === 1 ? "" : "s"} for "${searchQuery}"`
                : `${filteredData.length} client${filteredData.length === 1 ? "" : "s"} • Manage all client records`
              }
            </Text>
          </View>

          {/* SEARCH */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" />

            <TextInput
              placeholder="Search clients..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={styles.searchClear}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            )}

            <TouchableOpacity activeOpacity={0.8} style={styles.searchAction}>
              <Ionicons name="options-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* FILTERS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {DATE_FILTERS.map((item) => {
              const isActive = selectedDateFilter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterButton, isActive && styles.activeFilter]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedDateFilter(item);
                    if (item !== "Custom") {
                      setCustomFromDate("");
                      setCustomToDate("");
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{item}</Text>
                  <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                      {dateCounts[item] ?? 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CUSTOM DATE RANGE - BUTTON TO OPEN BOTTOM SHEET */}
          {selectedDateFilter === "Custom" && (
            <TouchableOpacity
              style={styles.customRangeTrigger}
              onPress={() => {
                setIsCalendarOpen(true);
                setIsCalendarLoading(true);
                // Simulate calendar load time
                setTimeout(() => setIsCalendarLoading(false), 300);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.customRangeContent}>
                <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.customRangeLabel}>Custom Date Range</Text>
                  <Text style={styles.customRangeValue} numberOfLines={1}>
                    {customFromDate && customToDate
                      ? `${customFromDate} to ${customToDate}`
                      : "Tap to select date range"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          )}

          {/* CUSTOM DATE RANGE BOTTOM SHEET */}
          <Modal
            visible={isCalendarOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setIsCalendarOpen(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setIsCalendarOpen(false)} />
            <View style={styles.dateRangeSheet}>
              <View style={styles.dateRangeHeader}>
                <View>
                  <Text style={styles.dateRangeTitle}>Select Date Range</Text>
                  <Text style={styles.dateRangeSubtitle}>
                    Choose start and end dates
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.modalClose}
                  onPress={() => setIsCalendarOpen(false)}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <View style={styles.datePickersContainer}>
                {/* START DATE */}
                <Pressable
                  style={[
                    styles.datePickerBox,
                    isSelectingFromDate && styles.datePickerBoxActive
                  ]}
                  onPress={() => {
                    setIsSelectingFromDate(true);
                  }}
                >
                  <View style={styles.datePickerLabel}>
                    <Ionicons name="calendar" size={16} color="#10b981" />
                    <Text style={styles.datePickerLabelText}>Start Date</Text>
                    {isSelectingFromDate && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeIndicatorText}>Selecting</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.datePickerValue,
                    !customFromDate && styles.datePickerPlaceholder
                  ]}>
                    {customFromDate || "Not selected"}
                  </Text>
                </Pressable>

                {/* END DATE */}
                <Pressable
                  style={[
                    styles.datePickerBox,
                    !isSelectingFromDate && styles.datePickerBoxActive
                  ]}
                  onPress={() => {
                    setIsSelectingFromDate(false);
                  }}
                >
                  <View style={styles.datePickerLabel}>
                    <Ionicons name="calendar" size={16} color="#ef4444" />
                    <Text style={styles.datePickerLabelText}>End Date</Text>
                    {!isSelectingFromDate && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeIndicatorText}>Selecting</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.datePickerValue,
                    !customToDate && styles.datePickerPlaceholder
                  ]}>
                    {customToDate || "Not selected"}
                  </Text>
                </Pressable>
              </View>

              {/* CALENDAR */}
              <View style={styles.calendarContainer}>
                {isCalendarLoading ? (
                  <View style={styles.calendarLoadingContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
                  </View>
                ) : (
                  <CalendarList
                    markedDates={{
                      ...(customFromDate ? { [customFromDate]: { selected: true, selectedColor: "#10b981" } } : {}),
                      ...(customToDate ? { [customToDate]: { selected: true, selectedColor: "#ef4444" } } : {}),
                    }}
                    pastScrollRange={12}
                    futureScrollRange={12}
                    scrollEnabled
                    showScrollIndicator={false}
                    theme={{
                      backgroundColor: "#ffffff",
                      calendarBackground: "#ffffff",
                      textSectionTitleColor: "#64748b",
                      selectedDayBackgroundColor: "#0f172a",
                      selectedDayTextColor: "#ffffff",
                      todayTextColor: "#3b82f6",
                      dayTextColor: "#0f172a",
                      textDisabledColor: "#cbd5e1",
                      arrowColor: "#0f172a",
                      monthTextColor: "#0f172a",
                      textMonthFontWeight: "800",
                      textDayFontWeight: "600",
                    }}
                    onDayPress={(day) => {
                      if (isSelectingFromDate) {
                        setCustomFromDate(day.dateString);
                        // Auto-switch to end date selection
                        setIsSelectingFromDate(false);
                      } else {
                        setCustomToDate(day.dateString);
                      }
                    }}
                  />
                )}
              </View>

              {/* ACTIONS - FIXED AT BOTTOM */}
              <View style={styles.dateRangeActions}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.dateRangeClearBtn}
                  onPress={() => {
                    setCustomFromDate("");
                    setCustomToDate("");
                    setIsSelectingFromDate(true);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                  <Text style={styles.dateRangeClearText}>Clear</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.dateRangeApplyBtn,
                    (!customFromDate || !customToDate) && styles.dateRangeApplyBtnDisabled
                  ]}
                  onPress={() => {
                    if (customFromDate && customToDate) {
                      setIsCalendarOpen(false);
                    }
                  }}
                  disabled={!customFromDate || !customToDate}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.dateRangeApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* LEAD FILTERS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {LEAD_FILTERS.map((item) => {
              const isActive = selectedLeadFilter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterButton, isActive && styles.activeFilter]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSelectedLeadFilter(item);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>{item}</Text>
                  <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                    <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                      {leadCounts[item] ?? 0}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* LIST */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading clients...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={searchQuery.trim() ? "search-outline" : "people-outline"} 
              size={48} 
              color="#cbd5e1" 
            />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? "No results found" : "No clients yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim() 
                ? `No clients match "${searchQuery}". Try a different search term.`
                : "Start by adding your first client to get started."
              }
            </Text>
            {searchQuery.trim() && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setSearchQuery("")}
                activeOpacity={0.8}
              >
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                colors={["#3b82f6"]}
                tintColor="#3b82f6"
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => {
              if (isLoadingMore) {
                return (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.loadingMoreText}>Loading more...</Text>
                  </View>
                );
              }
              
              // Show pagination info if available
              if (pagination && clients.length > 0) {
                const hasMore = pagination.current_page < pagination.last_page;
                
                if (hasMore) {
                  return (
                    <View style={styles.paginationInfoContainer}>
                      <Text style={styles.paginationInfoText}>
                        Page {pagination.current_page} of {pagination.last_page}
                      </Text>
                      <Text style={styles.paginationSubText}>
                        Scroll down to load more
                      </Text>
                    </View>
                  );
                } else {
                  return (
                    <View style={styles.endMessageContainer}>
                      <Text style={styles.endMessageText}>
                        Showing all {pagination.total || clients.length} clients
                      </Text>
                    </View>
                  );
                }
              }
              
              return null;
            }}
            contentContainerStyle={{
              paddingBottom: 110,
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.card}
                onPress={() => {
                  router.push(`/(drawer)/clients/${item.id}`);
                }}
              >
                {/* TOP */}
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {String(item.fullname || "?")
                          .trim()
                          .slice(0, 1)
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.primary}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.fullname}
                      </Text>
                      <Text style={styles.phone} numberOfLines={1}>
                        {item.phone}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <View
                      style={[
                        styles.leadBadge,
                        { backgroundColor: getLeadColor(item.lead_type) },
                      ]}
                    >
                      <Text style={styles.leadText}>{item.lead_type}</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </View>
                </View>

                {/* META */}
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Ionicons name="location-outline" size={14} color="#64748b" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>

                  <View style={styles.metaChip}>
                    <Ionicons
                      name={item.call_type === "incoming" ? "call-outline" : "return-down-forward-outline"}
                      size={14}
                      color="#64748b"
                    />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.call_type}
                    </Text>
                  </View>

                  <View style={styles.metaChipGhost}>
                    <Ionicons name="time-outline" size={14} color="#94a3b8" />
                    <Text style={styles.metaTextGhost}>
                      {item.created_date || 'No date'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.bookBtn}
                  onPress={() => {
                    setSelectedClient({
                      name: item.fullname,
                      phone: item.phone,
                      id: item.id,
                      location: item.location,
                      case_type: item.case_type || "",
                      referance: item.referance || "",
                    });
                    addAppointmentSheetRef.current?.snapToIndex(0);
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#0f172a" />
                  <Text style={styles.bookBtnText}>Book Appointment</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}

        {/* Add Appointment Sheet */}
        <AddAppointmentSheet
          ref={addAppointmentSheetRef}
          prefill={selectedClient}
          onSave={handleAppointmentSaved}
        />
      </View>
    );
  }

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f8fafc",
      paddingHorizontal: 20,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: "#64748b",
      fontWeight: "600",
    },

    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 20,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: "#0f172a",
      marginTop: 16,
      marginBottom: 8,
    },

    emptySubtitle: {
      fontSize: 14,
      color: "#64748b",
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 20,
    },

    clearSearchButton: {
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: "#3b82f6",
      borderRadius: 12,
    },

    clearSearchText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14,
    },
  
    header: {
      marginBottom: 18,
    },
  
    title: {
      fontSize: 32,
      fontWeight: "800",
      color: "#0f172a",
      letterSpacing: -0.4,
    },
  
    subtitle: {
      color: "#64748b",
      marginTop: 6,
      fontSize: 15,
    },
  
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#ffffff",
      paddingHorizontal: 14,
      borderRadius: 16,
      height: 54,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
  
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: "#0f172a",
      fontWeight: "600",
    },

    searchClear: {
      height: 28,
      width: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f1f5f9",
      marginRight: 8,
    },

    searchAction: {
      height: 34,
      width: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
  
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingRight: 12,
      marginBottom: 12,
    },
  
    filterButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  
    activeFilter: {
      backgroundColor: "#0f172a",
      borderColor: "#0f172a",
    },
  
    filterText: {
      color: "#0f172a",
      fontWeight: "600",
    },
  
    activeFilterText: {
      color: "#fff",
    },

    filterCount: {
      minWidth: 22,
      paddingHorizontal: 7,
      height: 20,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#e2e8f0",
    },

    filterCountActive: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },

    filterCountText: {
      color: "#0f172a",
      fontWeight: "800",
      fontSize: 12,
    },

    filterCountTextActive: {
      color: "#fff",
    },

    customRangeTrigger: {
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },

    customRangeContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    customRangeLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: "#0f172a",
      marginBottom: 4,
    },

    customRangeValue: {
      fontSize: 14,
      fontWeight: "600",
      color: "#64748b",
    },

    dateRangeSheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#ffffff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "85%",
      overflow: "hidden",
    },

    dateRangeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
    },

    dateRangeTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: "#0f172a",
    },

    dateRangeSubtitle: {
      fontSize: 13,
      fontWeight: "600",
      color: "#64748b",
      marginTop: 4,
    },

    datePickersContainer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },

    datePickerBox: {
      flex: 1,
      backgroundColor: "#f8fafc",
      borderWidth: 2,
      borderColor: "#e2e8f0",
      borderRadius: 12,
      padding: 12,
    },

    datePickerBoxActive: {
      backgroundColor: "#eff6ff",
      borderColor: "#3b82f6",
      borderWidth: 2,
    },

    datePickerLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
      flexWrap: "wrap",
    },

    datePickerLabelText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#64748b",
    },

    activeIndicator: {
      backgroundColor: "#3b82f6",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: "auto",
    },

    activeIndicatorText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#ffffff",
      textTransform: "uppercase",
    },

    datePickerValue: {
      fontSize: 14,
      fontWeight: "800",
      color: "#0f172a",
    },

    datePickerPlaceholder: {
      color: "#94a3b8",
      fontWeight: "600",
    },

    calendarContainer: {
      flex: 1,
      maxHeight: 350,
      minHeight: 300,
    },

    calendarLoadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 80,
    },

    calendarLoadingText: {
      marginTop: 12,
      fontSize: 14,
      color: "#64748b",
      fontWeight: "600",
    },

    dateRangeActions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 20,
      backgroundColor: "#ffffff",
      borderTopWidth: 1,
      borderTopColor: "#f1f5f9",
    },

    dateRangeClearBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    dateRangeClearText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#64748b",
    },

    dateRangeApplyBtn: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor: "#0f172a",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    dateRangeApplyBtnDisabled: {
      backgroundColor: "#cbd5e1",
    },

    dateRangeApplyText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#ffffff",
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.35)",
    },

    modalSheet: {
      backgroundColor: "#ffffff",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
      paddingBottom: 16,
    },

    modalHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#f1f5f9",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    modalTitle: {
      color: "#0f172a",
      fontWeight: "900",
      fontSize: 16,
    },

    modalSubtitle: {
      color: "#64748b",
      fontWeight: "600",
      marginTop: 2,
    },

    modalClose: {
      height: 36,
      width: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },

    modalFooter: {
      paddingHorizontal: 16,
      paddingTop: 12,
      flexDirection: "row",
      gap: 10,
    },

    modalGhost: {
      flex: 1,
      height: 46,
      borderRadius: 16,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      alignItems: "center",
      justifyContent: "center",
    },

    modalGhostText: {
      color: "#334155",
      fontWeight: "900",
    },

    modalPrimary: {
      flex: 1,
      height: 46,
      borderRadius: 16,
      backgroundColor: "#0f172a",
      alignItems: "center",
      justifyContent: "center",
    },

    modalPrimaryText: {
      color: "#ffffff",
      fontWeight: "900",
    },
  
    card: {
      backgroundColor: "#fff",
      borderRadius: 22,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#eef2f7",
      shadowColor: "#0f172a",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
      elevation: 2,
    },
  
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 10,
    },

    avatar: {
      height: 40,
      width: 40,
      borderRadius: 14,
      backgroundColor: "#eef2ff",
      borderWidth: 1,
      borderColor: "#e0e7ff",
      alignItems: "center",
      justifyContent: "center",
    },

    avatarText: {
      color: "#3730a3",
      fontWeight: "900",
      fontSize: 15,
      letterSpacing: 0.4,
    },

    primary: {
      marginLeft: 10,
      flex: 1,
      minWidth: 0,
    },

    cardRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  
    name: {
      fontSize: 16.5,
      fontWeight: "800",
      color: "#0f172a",
    },
  
    phone: {
      color: "#64748b",
      marginTop: 2,
      fontWeight: "600",
      fontSize: 12.5,
    },
  
    leadBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
  
    leadText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 11.5,
    },

    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },

    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      maxWidth: "48%",
    },

    metaText: {
      color: "#334155",
      fontWeight: "700",
      fontSize: 12,
    },

    metaChipGhost: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "#ffffff",
      borderWidth: 1,
      borderColor: "#f1f5f9",
    },

    metaTextGhost: {
      color: "#94a3b8",
      fontWeight: "700",
      fontSize: 12,
    },

    bookBtn: {
      marginTop: 10,
      height: 42,
      borderRadius: 14,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    bookBtnText: {
      color: "#0f172a",
      fontWeight: "900",
    },

    loadingMoreContainer: {
      paddingVertical: 20,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
    },

    loadingMoreText: {
      fontSize: 14,
      color: "#64748b",
      fontWeight: "600",
    },

    endMessageContainer: {
      paddingVertical: 20,
      alignItems: "center",
    },

    endMessageText: {
      fontSize: 14,
      color: "#94a3b8",
      fontWeight: "600",
    },

    paginationInfoContainer: {
      paddingVertical: 20,
      alignItems: "center",
      gap: 4,
    },

    paginationInfoText: {
      fontSize: 14,
      color: "#3b82f6",
      fontWeight: "700",
    },

    paginationSubText: {
      fontSize: 12,
      color: "#94a3b8",
      fontWeight: "600",
    },
  });
