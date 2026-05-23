import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import AddAppointmentSheet from "../../components/AddAppointmentSheet";
import { getClientDetails } from "../../../services/api/clientService";
import { addFollowup } from "../../../services/api/followupService";
import { showErrorToast, showSuccessToast } from "../../../utils/toast";

export default function ClientDetailsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const params = useLocalSearchParams();
  const appointmentSheetRef = useRef(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUps, setFollowUps] = useState([]);
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingFollowup, setIsSubmittingFollowup] = useState(false);

  const clientId = params?.id;

  // Fetch client details from API
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!clientId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // First try to get client details from dedicated endpoint
        const result = await getClientDetails(clientId);

        if (result.success && result.data?.data) {
          const clientData = result.data.data;
          
          // Transform API data to match component expectations
          const transformedClient = {
            id: clientData.id,
            name: clientData.fullname || "Unknown Client",
            phone: clientData.phone || "N/A",
            location: clientData.location || "N/A",
            lead: clientData.lead_type || "Cold",
            type: clientData.call_type || "Incoming",
            email: clientData.email || "N/A",
            caseType: clientData.case_type || "N/A",
            reference: clientData.referance || "N/A", // Note: API uses 'referance'
            remarks: clientData.remarks || "No remarks available",
            appointments: clientData.appointments_count || 0,
            followups: clientData.followups_count || 0,
            lastContact: clientData.created_at 
              ? new Date(clientData.created_at).toLocaleDateString() + " at " + new Date(clientData.created_at).toLocaleTimeString()
              : "N/A",
            date: clientData.created_at 
              ? new Date(clientData.created_at).toLocaleDateString()
              : "N/A",
          };

          setClient(transformedClient);
        } else {
          // If client details endpoint doesn't exist, try to get from client list
          
          // For now, create a basic client object with the ID
          // In a real scenario, you might want to fetch the client list and find the specific client
          setClient({
            id: clientId,
            name: `Client ${clientId}`,
            phone: "N/A",
            location: "N/A",
            lead: "Cold",
            type: "Incoming",
            email: "N/A",
            caseType: "N/A",
            reference: "N/A",
            remarks: "Client details endpoint not available. Please contact support.",
            appointments: 0,
            followups: 0,
            lastContact: "N/A",
            date: "N/A",
          });
          
          showErrorToast("Client details not available. Showing basic information.");
        }
      } catch (error) {
        showErrorToast("An unexpected error occurred");
        
        // Set a fallback client to prevent crashes
        setClient({
          id: clientId,
          name: `Client ${clientId}`,
          phone: "N/A",
          location: "N/A",
          lead: "Cold",
          type: "Incoming",
          email: "N/A",
          caseType: "N/A",
          reference: "N/A",
          remarks: "Error loading client details",
          appointments: 0,
          followups: 0,
          lastContact: "N/A",
          date: "N/A",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientDetails();
  }, [clientId]);

  useEffect(() => {
    if (client?.name) {
      nav.setOptions?.({ title: client.name });
    }
  }, [nav, client?.name]);

  // Ensure appointment sheet stays closed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (appointmentSheetRef.current) {
        appointmentSheetRef.current.close();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [client]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <TouchableOpacity
          style={styles.backButtonLoading}
          onPress={() => nav.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    );
  }

  // Show error state if no client data
  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorTitle}>Client Not Found</Text>
        <Text style={styles.errorText}>The requested client could not be found.</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => nav.goBack()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCall = () => {
    const phoneNumber = client.phone.replace(/\D/g, ""); // Remove non-digits
    const phoneUrl = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          // Fallback: Copy to clipboard and show alert
          Clipboard.setStringAsync(client.phone);
          Alert.alert(
            "Phone Number Copied",
            `Phone number copied to clipboard:\n${client.phone}\n\nYou can now paste it in your phone dialer.`,
            [{ text: "OK" }]
          );
        }
      })
      .catch((err) => {
        // Fallback: Copy to clipboard
        Clipboard.setStringAsync(client.phone);
        Alert.alert(
          "Phone Number Copied",
          `Unable to open dialer directly.\n\nPhone number copied to clipboard:\n${client.phone}\n\nYou can now paste it in your phone dialer.`,
          [{ text: "OK" }]
        );
      });
  };

  const handleWhatsApp = () => {
    const phoneNumber = client.phone.replace(/\D/g, ""); // Remove non-digits
    const whatsappUrl = `https://wa.me/${phoneNumber}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert(
            "WhatsApp Not Available",
            "WhatsApp is not installed on your device.",
            [{ text: "OK" }]
          );
        }
      })
      .catch((err) => {
        Alert.alert(
          "Error",
          "Unable to open WhatsApp. Please try again.",
          [{ text: "OK" }]
        );
      });
  };

  const handleEmail = () => {
    const emailUrl = `mailto:${client.email}`;
    
    Linking.canOpenURL(emailUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(emailUrl);
        } else {
          Alert.alert(
            "Email Not Available",
            "No email client is configured on your device.",
            [{ text: "OK" }]
          );
        }
      })
      .catch((err) => {
        Alert.alert(
          "Error",
          "Unable to open email client. Please try again.",
          [{ text: "OK" }]
        );
      });
  };

  const handleSaveFollowUp = async () => {
    if (!followUpMessage.trim()) {
      Alert.alert("Error", "Please enter a follow-up message");
      return;
    }

    if (!client?.id) {
      Alert.alert("Error", "Client information not available");
      return;
    }

    try {
      setIsSubmittingFollowup(true);

      // Prepare follow-up data
      const now = new Date();
      const followupData = {
        client_id: client.id,
        followup_date: now.toISOString(), // Will be formatted in the service
        remarks: followUpMessage.trim(),
      };

      // Note: appointment_id is omitted for general follow-ups
      // It will only be included if we're adding a follow-up for a specific appointment

      // Call the API
      const result = await addFollowup(followupData);

      if (result.success) {
        // Create local follow-up object for immediate UI update
        const newFollowUp = {
          id: result.data?.id || Date.now().toString(),
          clientName: client.name,
          clientId: client.id,
          message: followUpMessage,
          timestamp: new Date().toLocaleString(),
          date: new Date(),
          status: result.data?.status_text || 'Pending',
        };

        // Update local state
        setFollowUps([newFollowUp, ...followUps]);
        setFollowUpMessage("");
        setShowFollowUpModal(false);

        // Show success toast instead of alert
        showSuccessToast(
          result.message || "Follow-up added successfully!",
          "Follow-up Saved"
        );
      } else {
        // Handle API error
        showErrorToast(
          result.message || "Failed to add follow-up. Please try again.",
          "Follow-up Error"
        );
      }
    } catch (error) {
      showErrorToast(
        "An unexpected error occurred. Please try again.",
        "Follow-up Error"
      );
    } finally {
      setIsSubmittingFollowup(false);
    }
  };

  const getLeadColor = (lead) => {
    if (lead === "Hot") return { bg: "#fef2f2", text: "#ef4444", icon: "#dc2626" };
    if (lead === "Warm") return { bg: "#fffbf0", text: "#f59e0b", icon: "#d97706" };
    return { bg: "#ecf9ff", text: "#06b6d4", icon: "#0891b2" };
  };

  const leadColor = getLeadColor(client.lead);

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
      {/* BACK BUTTON */}
      <Animated.View
        style={styles.backButtonContainer}
        entering={FadeInDown.duration(400)}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => nav.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* HEADER CARD */}
      <Animated.View
        style={styles.headerCard}
        entering={FadeInDown.duration(600)}
      >
        <LinearGradient
          colors={["#3b82f6", "#2563eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {client.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientLocation}>
              <Ionicons name="location" size={14} color="#fff" /> {client.location}
            </Text>
          </View>

          <View style={[styles.leadBadgeLarge, { backgroundColor: leadColor.bg }]}>
            <Text style={[styles.leadBadgeText, { color: leadColor.text }]}>
              {client.lead}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* QUICK ACTIONS */}
      <Animated.View
        style={styles.quickActions}
        entering={FadeInUp.duration(600).delay(100)}
      >
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#ef4444", "#dc2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Ionicons name="call" size={28} color="#fff" />
            <Text style={styles.actionLabel}>Call Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleWhatsApp}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#10b981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
            <Text style={styles.actionLabel}>WhatsApp</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEmail}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#f59e0b", "#d97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Ionicons name="mail" size={24} color="#fff" />
            <Text style={styles.actionLabel}>Email</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* CONTACT INFO */}
      <Animated.View
        style={styles.section}
        entering={FadeInUp.duration(600).delay(200)}
      >
        <Text style={styles.sectionTitle}>Contact Information</Text>

        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={handleCall}
            activeOpacity={0.7}
          >
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#ef4444" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{client.phone}</Text>
            </View>
            <View style={styles.callIconContainer}>
              <Ionicons name="call" size={18} color="#ef4444" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.infoRow}
            onPress={handleEmail}
            activeOpacity={0.7}
          >
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#f59e0b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{client.email}</Text>
            </View>
            <View style={styles.callIconContainer}>
              <Ionicons name="open-outline" size={18} color="#f59e0b" />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color="#3b82f6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{client.location}</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* CASE DETAILS */}
      <Animated.View
        style={styles.section}
        entering={FadeInUp.duration(600).delay(300)}
      >
        <Text style={styles.sectionTitle}>Case Details</Text>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <Ionicons name="briefcase-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.detailLabel}>Case Type</Text>
            <Text style={styles.detailValue}>{client.caseType}</Text>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <Ionicons name="people-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{client.reference}</Text>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <Ionicons name="call-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.detailLabel}>Call Type</Text>
            <Text style={styles.detailValue}>{client.type}</Text>
          </View>

          <View style={styles.detailCard}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.detailLabel}>Last Contact</Text>
            <Text style={styles.detailValue}>{client.lastContact}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ACTIVITY STATS */}
      {/* <Animated.View
        style={styles.section}
        entering={FadeInUp.duration(600).delay(400)}
      >
        <Text style={styles.sectionTitle}>Activity</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statNumber}>
              <Text style={styles.statValue}>{client.appointments}</Text>
            </View>
            <Text style={styles.statLabel}>Appointments</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statNumber}>
              <Text style={styles.statValue}>{client.followups}</Text>
            </View>
            <Text style={styles.statLabel}>Follow-ups</Text>
          </View>
        </View>
      </Animated.View> */}

      {/* REMARKS */}
      <Animated.View
        style={styles.section}
        entering={FadeInUp.duration(600).delay(500)}
      >
        <Text style={styles.sectionTitle}>Remarks</Text>

        <View style={styles.remarksCard}>
          <Text style={styles.remarksText}>{client.remarks}</Text>
        </View>
      </Animated.View>

      {/* ACTION BUTTONS */}
      <Animated.View
        style={styles.actionButtons}
        entering={FadeInUp.duration(600).delay(600)}
      >
        {/* COMMENTED OUT - Schedule Appointment Button
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={() => appointmentSheetRef.current?.expand()}
        >
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Schedule Appointment</Text>
        </TouchableOpacity>
        */}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowFollowUpModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#3b82f6" />
          <Text style={styles.secondaryButtonText}>Add Follow-up</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* FOLLOW-UP MODAL */}
      <Modal
        visible={showFollowUpModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFollowUpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={styles.modalContent}
            entering={FadeInUp.duration(400)}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Follow-up</Text>
              <TouchableOpacity
                onPress={() => setShowFollowUpModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Follow-up Message</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your follow-up message..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={5}
                value={followUpMessage}
                onChangeText={setFollowUpMessage}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowFollowUpModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  isSubmittingFollowup && styles.modalSaveBtnDisabled
                ]}
                onPress={handleSaveFollowUp}
                disabled={isSubmittingFollowup}
              >
                {isSubmittingFollowup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
                <Text style={styles.modalSaveText}>
                  {isSubmittingFollowup ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <AddAppointmentSheet
        ref={appointmentSheetRef}
        prefill={{
          mode: "New",
          name: client.name,
          phone: client.phone,
          id: client.id,
          location: client.location,
          reference: client.reference,
          case_type: client.caseType,
        }}
        onSave={() => {
          appointmentSheetRef.current?.close();
        }}
      />
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

  backButtonContainer: {
    marginBottom: 16,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignSelf: "flex-start",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },

  headerCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },

  headerGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  avatarLarge: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },

  avatarLargeText: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
  },

  headerInfo: {
    flex: 1,
  },

  clientName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 6,
  },

  clientLocation: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },

  leadBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  leadBadgeText: {
    fontWeight: "800",
    fontSize: 12,
  },

  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },

  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  actionGradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  actionLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },

  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
  },

  callIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  detailCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  detailLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  statNumber: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#3b82f6",
  },

  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },

  remarksCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  remarksText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
    lineHeight: 20,
  },

  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },

  primaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },

  secondaryButtonText: {
    color: "#3b82f6",
    fontWeight: "800",
    fontSize: 15,
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
    maxHeight: "80%",
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

  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
    minHeight: 120,
  },

  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelText: {
    color: "#334155",
    fontWeight: "800",
    fontSize: 14,
  },

  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  modalSaveBtnDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0.1,
  },

  modalSaveText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingVertical: 60,
  },

  backButtonLoading: {
    position: "absolute",
    top: 60,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 40,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 16,
    marginBottom: 8,
  },

  errorText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },

  errorButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  errorButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
