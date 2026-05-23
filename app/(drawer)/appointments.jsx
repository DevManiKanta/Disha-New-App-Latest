import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Calendar } from "react-native-calendars";
import { getAppointmentsList } from "../../services/api/appointmentService";
import { showErrorToast } from "../../utils/toast";
import AddAppointmentSheet from "../components/AddAppointmentSheet";

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const addAppointmentSheetRef = useRef(null);
  
  // Remove recent activities state and imports
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pagination, setPagination] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Client details from navigation params
  const clientData = {
    name: params.name || "",
    phone: params.phone || "",
    id: params.clientId || "",
  };

  const fetchAppointments = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      // Fetch appointments with the selected date
      // API expects: appointment_date=2026-05-23
      const appointmentsResult = await getAppointmentsList(
        selectedDate ? { date: selectedDate } : {}
      );
      
    
      // Process appointments data
      if (appointmentsResult.success) {
        // Check if we have data array
        if (appointmentsResult.data?.data && Array.isArray(appointmentsResult.data.data)) {
          // Transform API data to match component expectations
          const transformedAppointments = appointmentsResult.data.data.map((appointment, index) => {
            const transformed = {
              id: appointment.id ? appointment.id.toString() : `temp-${index}`,
              clientName: appointment.client_name || 'Unknown Client',
              clientPhone: appointment.client_phone || '',
              date: appointment.appointment_date ? appointment.appointment_date.split('T')[0] : '',
              time: appointment.appointment_time || '',
              type: appointment.appointment_type === 'online' ? 'Online' : 'Offline',
              clientType: appointment.client_type === 'new_client' ? 'New Client' : 'Existing Client',
              status: appointment.status_text || 'Pending',
              fee: appointment.fee_amount ? appointment.fee_amount.toString() : '0',
              notes: appointment.remarks || '',
              paymentMethod: appointment.payment_method || 'cash',
              typeLabel: appointment.type_label || appointment.appointment_type || '',
              clientLabel: appointment.client_label || (appointment.client_type === 'new_client' ? 'New Client' : 'Existing Client'),
              addedBy: appointment.added_by || null,
            };
            
            return transformed;
          });
          
          setAppointments(transformedAppointments);
          setPagination(appointmentsResult.pagination || {});
        } else {
          setAppointments([]);
          setPagination({});
        }
      } else {
        showErrorToast(appointmentsResult.message || "Failed to load appointments");
        setAppointments([]);
        setPagination({});
      }

    } catch (error) {
      showErrorToast("An unexpected error occurred");
      setAppointments([]);
      setPagination({});
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch appointments on mount and when date changes
  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  // Refresh appointments when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAppointments(false);
      
      // Check if we should open the appointment sheet
      if (params.openSheet === "1" && clientData.name && clientData.phone) {
        // Small delay to ensure the sheet is ready
        setTimeout(() => {
          addAppointmentSheetRef.current?.snapToIndex(0);
        }, 500);
      }
    }, [params.openSheet, clientData.name, clientData.phone])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchAppointments(false);
  };

  const handleAppointmentSaved = () => {
    // Refresh the appointments list when a new appointment is saved
    fetchAppointments(false);
  };

  // Show only appointments data
  const displayData = appointments;

  const getStatusColor = (status) => {
    if (status === "Confirmed") return { bg: "#ecfdf5", text: "#10b981" };
    if (status === "Pending") return { bg: "#fef3c7", text: "#f59e0b" };
    if (status === "Cancelled") return { bg: "#fee2e2", text: "#ef4444" };
    return { bg: "#f1f5f9", text: "#64748b" };
  };

  const getTypeColor = (type) => {
    return type === "Online" ? "#3b82f6" : "#8b5cf6";
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 16, 16),
          paddingBottom: Math.max(insets.bottom + 20, 20),
        },
      ]}
    >
      {/* HEADER */}
      <Animated.View style={styles.header} entering={FadeInUp.duration(600)}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Appointments</Text>
          <Text style={styles.title}>
            {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} on {new Date(selectedDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Today Button */}
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              activeOpacity={0.8}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
          
          {/* Date Picker Button */}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setIsCalendarOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={20} color="#3b82f6" />
            <Text style={styles.dateButtonText}>
              {new Date(selectedDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
              })}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* APPOINTMENTS LIST */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#3b82f6"]}
              tintColor="#3b82f6"
            />
          }
          renderItem={({ item, index }) => {
            const statusColor = getStatusColor(item.status);
            const typeColor = getTypeColor(item.type);
            
            return (
              <Animated.View
                style={styles.appointmentCard}
                entering={FadeInUp.duration(600).delay(index * 100)}
              >
                <LinearGradient
                  colors={["#ffffff", "#f8fafc"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.typeIcon, { backgroundColor: typeColor + "15" }]}>
                        <Ionicons
                          name={item.type === "Online" ? "videocam" : "location"}
                          size={22}
                          color={typeColor}
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.clientName}>{item.clientName}</Text>
                        <Text style={styles.clientType}>
                          {item.clientType} • {item.type}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      {/* <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {item.status}
                      </Text> */}
                    </View>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailItem}>
                        <View style={styles.detailIcon}>
                          <Ionicons name="calendar" size={16} color="#64748b" />
                        </View>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Date</Text>
                          <Text style={styles.detailValue}>
                            {formatDate(item.date) || 'Not set'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detailItem}>
                        <View style={styles.detailIcon}>
                          <Ionicons name="time" size={16} color="#64748b" />
                        </View>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Time</Text>
                          <Text style={styles.detailValue}>{item.time || 'Not set'}</Text>
                        </View>
                      </View>

                      {item.clientPhone && (
                        <View style={styles.detailItem}>
                          <View style={styles.detailIcon}>
                            <Ionicons name="call" size={16} color="#64748b" />
                          </View>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Phone</Text>
                            <Text style={styles.detailValue}>{item.clientPhone}</Text>
                          </View>
                        </View>
                      )}

                      {item.fee && item.fee !== '0' && (
                        <View style={styles.detailItem}>
                          <View style={styles.detailIcon}>
                            <Ionicons name="cash" size={16} color="#64748b" />
                          </View>
                          <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Fee</Text>
                            <Text style={styles.detailValue}>₹{item.fee}</Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {item.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes</Text>
                        <Text style={styles.notesText}>{item.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.paymentInfo}>
                      <Ionicons 
                        name={item.paymentMethod === 'cash' ? "cash" : "card"} 
                        size={14} 
                        color="#94a3b8" 
                      />
                      <Text style={styles.paymentText}>
                        {item.paymentMethod === 'cash' ? 'Cash Payment' : 'Online Payment'}
                      </Text>
                    </View>
                    {item.addedBy && (
                      <Text style={styles.addedByText}>
                        Added by {item.addedBy.name || 'Unknown'}
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            );
          }}
        />
      )}

      {displayData.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No appointments found</Text>
          <Text style={styles.emptySubtitle}>
            {appointments.length === 0
              ? "No appointments have been scheduled yet" 
              : "Try adjusting your date filter"}
          </Text>
        </View>
      )}

      {/* PAGINATION INFO */}
      {pagination && pagination.total > 0 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {displayData.length} of {pagination.total} appointments
            {pagination.current_page && pagination.last_page && (
              ` • Page ${pagination.current_page} of ${pagination.last_page}`
            )}
          </Text>
        </View>
      )}
      
      {/* Add Appointment Sheet */}
      <AddAppointmentSheet
        ref={addAppointmentSheetRef}
        prefill={clientData.name ? clientData : null}
        onSave={handleAppointmentSaved}
      />

      {/* Calendar Modal */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setIsCalendarOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <Calendar
              current={selectedDate}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setIsCalendarOpen(false);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#3b82f6",
                  selectedTextColor: "#fff",
                },
              }}
              theme={{
                backgroundColor: "#fff",
                calendarBackground: "#fff",
                textSectionTitleColor: "#0f172a",
                selectedDayBackgroundColor: "#3b82f6",
                selectedDayTextColor: "#fff",
                todayTextColor: "#3b82f6",
                dayTextColor: "#0f172a",
                textDisabledColor: "#cbd5e1",
                monthTextColor: "#0f172a",
                arrowColor: "#3b82f6",
                textMonthFontWeight: "800",
                textDayFontWeight: "600",
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
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

  header: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  todayButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3b82f6",
  },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  dateButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
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
  },

  statsSection: {
    marginBottom: 16,
  },

  statsRow: {
    gap: 12,
    paddingBottom: 4,
  },

  statCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    minWidth: 80,
  },

  statNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 2,
  },

  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  listContent: {
    paddingBottom: 20,
  },

  appointmentCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    backgroundColor: "#fff",
  },

  cardGradient: {
    padding: 20,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  cardInfo: {
    flex: 1,
  },

  clientName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },

  clientType: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  cardBody: {
    marginBottom: 16,
  },

  detailsGrid: {
    gap: 12,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  notesLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  notesText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    lineHeight: 18,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  paymentText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  addedByText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 12,
  },

  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },

  paginationInfo: {
    paddingVertical: 16,
    alignItems: "center",
  },

  paginationText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
  },

  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
});