import React, { forwardRef, useEffect, useMemo, useState } from "react";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar } from "react-native-calendars";
import { addAppointment } from "../../services/api/appointmentService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

const AddAppointmentSheet = forwardRef(
  ({ prefill, onSave }, ref) => {
    const snapPoints = useMemo(() => ["90%"], []);
    const [isSheetReady, setIsSheetReady] = useState(false);

    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientId, setClientId] = useState("");
    const [appointmentDate, setAppointmentDate] = useState("");
    const [appointmentTime, setAppointmentTime] = useState("");
    const [appointmentType, setAppointmentType] = useState("online");
    const [clientType, setClientType] = useState("new_client");
    const [feeAmount, setFeeAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [remarks, setRemarks] = useState("");
    const [location, setLocation] = useState("");
    const [reference, setReference] = useState("");
    const [caseType, setCaseType] = useState("");
    const [callType, setCallType] = useState("incoming");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Ensure the sheet stays closed initially and is properly initialized
    useEffect(() => {
      // Add a delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        if (ref?.current) {
          ref.current.close();
          setIsSheetReady(true);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }, []);

    // Also ensure it stays closed when prefill data changes
    useEffect(() => {
      if (prefill && ref?.current && isSheetReady) {
        // Don't auto-open when prefill data is provided
        ref.current.close();
      }
    }, [prefill, isSheetReady]);

    useEffect(() => {
      if (prefill) {
        setClientName(prefill.name || "");
        setClientPhone(prefill.phone || "");
        setClientId(String(prefill.id || ""));
        setLocation(prefill.location || "");
        setReference(prefill.referance || prefill.reference || ""); // Note: API uses 'referance' not 'reference'
        setCaseType(prefill.case_type || "");
      }
    }, [prefill]);

    const validateForm = () => {
      const newErrors = {};
      
      if (!clientName.trim()) {
        newErrors.clientName = "Client name is required";
      }
      
      if (!clientPhone.trim()) {
        newErrors.clientPhone = "Phone number is required";
      } else if (!/^\d{10}$/.test(clientPhone.replace(/\D/g, ''))) {
        newErrors.clientPhone = "Please enter a valid 10-digit phone number";
      }
      
      if (!clientId.trim()) {
        newErrors.clientId = "Client ID is required";
      }
      
      if (!appointmentDate) {
        newErrors.appointmentDate = "Appointment date is required";
      } else {
        // Validate date format and range
        const selectedDate = new Date(appointmentDate);
        const today = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + 2); // Allow up to 2 years in future
        
        if (isNaN(selectedDate.getTime())) {
          newErrors.appointmentDate = "Please select a valid date";
        } else if (selectedDate < today.setHours(0, 0, 0, 0)) {
          newErrors.appointmentDate = "Appointment date cannot be in the past";
        } else if (selectedDate > maxDate) {
          newErrors.appointmentDate = "Appointment date is too far in the future";
        }
      }
      
      if (!appointmentTime.trim()) {
        newErrors.appointmentTime = "Appointment time is required";
      } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(appointmentTime)) {
        newErrors.appointmentTime = "Please enter time in HH:MM format (e.g., 14:30)";
      }
      
      if (feeAmount && isNaN(parseFloat(feeAmount))) {
        newErrors.feeAmount = "Please enter a valid fee amount";
      }
      
      if (!paymentMethod || paymentMethod.trim() === "") {
        newErrors.paymentMethod = "Payment method is required";
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
      // Clear previous errors
      setErrors({});
      
      // Validate form
      if (!validateForm()) {
        showErrorToast("Please fix the errors and try again");
        return;
      }

      setIsLoading(true);

      try {
        // Format appointment date for MySQL compatibility (YYYY-MM-DD)
        let formattedDate = appointmentDate;
        
        // Ensure date is in YYYY-MM-DD format (not ISO datetime)
        if (appointmentDate) {
          const dateObj = new Date(appointmentDate);
          if (!isNaN(dateObj.getTime())) {
            // Format as YYYY-MM-DD for MySQL date column
            formattedDate = dateObj.toISOString().split('T')[0];
          }
        }
        
        const appointmentData = {
          appointment_type: appointmentType,
          client_type: clientType,
          appointment_date: formattedDate, // MySQL date format: YYYY-MM-DD
          appointment_time: appointmentTime.trim(), // Ensure no trailing spaces
          fee_amount: feeAmount ? parseFloat(feeAmount) : 0, // Send as number
          payment_method: paymentMethod,
          remarks: remarks.trim() || "Appointment booked from mobile app", // Default message if empty
          client_id: clientId.trim(),
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          call_type: callType,
          location: location.trim() || "",
          referance: reference.trim() || "",
          case_type: caseType.trim() || "",
        };

        const result = await addAppointment(appointmentData);

        if (result.success) {
          showSuccessToast(result.message || "Appointment scheduled successfully!");
          
          // Call parent callback if provided
          onSave?.(result.data);
          
          // Reset form and close sheet
          resetForm();
          ref.current?.close();
        } else {
          // Handle API errors with improved error handling
          
          // Set field-specific validation errors if provided
          if (result.validationErrors && Object.keys(result.validationErrors).length > 0) {
            setErrors(result.validationErrors);
          }
          
          // Show appropriate error message
          showErrorToast(result.message || "Failed to schedule appointment");
          
          // Handle specific error cases for better UX
          if (result.errorCode === 401) {
            // Session expired - could redirect to login
            setTimeout(() => {
              showErrorToast("Please login again to continue");
            }, 2000);
          } else if (result.errorCode === 409) {
            // Conflict errors - highlight relevant fields
            if (result.message.toLowerCase().includes('phone')) {
              setErrors(prev => ({ ...prev, clientPhone: "Phone number already exists" }));
            } else if (result.message.toLowerCase().includes('client id')) {
              setErrors(prev => ({ ...prev, clientId: "Client ID already exists" }));
            }
          } else if (result.errorCode === 422) {
            // Validation errors - fields should already be highlighted via validationErrors
            if (Object.keys(result.validationErrors || {}).length === 0) {
              // If no specific field errors, show general validation message
              showErrorToast("Please check your input and try again");
            }
          }
        }
      } catch (error) {
        // Handle unexpected errors (network issues, etc.)
        showErrorToast("Network error. Please check your connection and try again.");
      } finally {
        setIsLoading(false);
      }
    };

    const resetForm = () => {
      setClientName("");
      setClientPhone("");
      setClientId("");
      setAppointmentDate("");
      setAppointmentTime("");
      setAppointmentType("online");
      setClientType("new_client");
      setFeeAmount("");
      setPaymentMethod("cash"); // Ensure it's always set to a valid value
      setRemarks("");
      setLocation("");
      setReference("");
      setCaseType("");
      setCallType("incoming");
      setErrors({});
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        keyboardBehavior="interactive"
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
        animateOnMount={false}
        activeOffsetY={[-1, 1]}
        failOffsetX={[-5, 5]}
        onChange={(index) => {
          // Prevent any automatic opening
          if (index > -1 && !isSheetReady) {
            setTimeout(() => {
              ref?.current?.close();
            }, 50);
          }
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Appointment</Text>
            <Text style={styles.subtitle}>Fill in the details below</Text>
          </View>

          {/* CLIENT INFO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client Name *</Text>
              <View style={[
                styles.inputWrapper,
                errors.clientName && styles.inputError
              ]}>
                <Ionicons name="person-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter client name"
                  placeholderTextColor="#94a3b8"
                  value={clientName}
                  onChangeText={(text) => {
                    setClientName(text);
                    if (errors.clientName) {
                      setErrors({ ...errors, clientName: null });
                    }
                  }}
                  editable={!isLoading}
                />
              </View>
              {errors.clientName && (
                <Text style={styles.errorText}>{errors.clientName}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={[
                styles.inputWrapper,
                errors.clientPhone && styles.inputError
              ]}>
                <Ionicons name="call-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#94a3b8"
                  value={clientPhone}
                  onChangeText={(text) => {
                    setClientPhone(text);
                    if (errors.clientPhone) {
                      setErrors({ ...errors, clientPhone: null });
                    }
                  }}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
              {errors.clientPhone && (
                <Text style={styles.errorText}>{errors.clientPhone}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client ID *</Text>
              <View style={[
                styles.inputWrapper,
                errors.clientId && styles.inputError
              ]}>
                <Ionicons name="card-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter client ID"
                  placeholderTextColor="#94a3b8"
                  value={clientId}
                  onChangeText={(text) => {
                    setClientId(text);
                    if (errors.clientId) {
                      setErrors({ ...errors, clientId: null });
                    }
                  }}
                  editable={!isLoading}
                />
              </View>
              {errors.clientId && (
                <Text style={styles.errorText}>{errors.clientId}</Text>
              )}
            </View>
          </View>

          {/* APPOINTMENT DETAILS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appointment Details</Text>

            {/* DATE PICKER */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date *</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  errors.appointmentDate && styles.inputError
                ]}
                onPress={() => setIsCalendarOpen(true)}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
                <View style={styles.datePickerContent}>
                  <Text style={styles.datePickerLabel}>Select Date</Text>
                  <Text style={styles.datePickerValue}>
                    {appointmentDate || "Tap to select date"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
              {errors.appointmentDate && (
                <Text style={styles.errorText}>{errors.appointmentDate}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time (HH:MM) *</Text>
              <View style={[
                styles.inputWrapper,
                errors.appointmentTime && styles.inputError
              ]}>
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="14:30"
                  placeholderTextColor="#94a3b8"
                  value={appointmentTime}
                  onChangeText={(text) => {
                    setAppointmentTime(text);
                    if (errors.appointmentTime) {
                      setErrors({ ...errors, appointmentTime: null });
                    }
                  }}
                  editable={!isLoading}
                />
              </View>
              {errors.appointmentTime && (
                <Text style={styles.errorText}>{errors.appointmentTime}</Text>
              )}
            </View>

            {/* TYPE, CLIENT TYPE & PAYMENT METHOD ROW */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.buttonGroup}>
                  {[
                    { key: "online", label: "Online" },
                    { key: "offline", label: "Offline" },
                    // { key: "consultation", label: "Consultation" },
                    // { key: "follow_up", label: "Follow Up" }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeButton,
                        appointmentType === type.key && styles.typeButtonActive,
                      ]}
                      onPress={() => setAppointmentType(type.key)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          appointmentType === type.key && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Client</Text>
                <View style={styles.buttonGroup}>
                  {[
                    { key: "new_client", label: "New" },
                    { key: "existing_client", label: "Existing" }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeButton,
                        clientType === type.key && styles.typeButtonActive,
                      ]}
                      onPress={() => setClientType(type.key)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          clientType === type.key && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* PAYMENT METHOD & CALL TYPE */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Payment *</Text>
                <View style={[
                  styles.buttonGroup,
                  errors.paymentMethod && styles.buttonGroupError
                ]}>
                  {[
                    { key: "cash", label: "Cash" },
                    { key: "online", label: "Online" }
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        styles.typeButton,
                        paymentMethod === method.key && styles.typeButtonActive,
                        errors.paymentMethod && styles.typeButtonError,
                      ]}
                      onPress={() => {
                        setPaymentMethod(method.key);
                        if (errors.paymentMethod) {
                          setErrors({ ...errors, paymentMethod: null });
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          paymentMethod === method.key && styles.typeButtonTextActive,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.paymentMethod && (
                  <Text style={styles.errorText}>{errors.paymentMethod}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Call Type</Text>
                <View style={styles.buttonGroup}>
                  {[
                    { key: "incoming", label: "Incoming" },
                    { key: "outgoing", label: "Outgoing" }
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.key}
                      style={[
                        styles.typeButton,
                        callType === type.key && styles.typeButtonActive,
                      ]}
                      onPress={() => setCallType(type.key)}
                      disabled={isLoading}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          callType === type.key && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* ADDITIONAL INFO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fee Amount</Text>
              <View style={[
                styles.inputWrapper,
                errors.feeAmount && styles.inputError
              ]}>
                <Ionicons name="cash-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter fee amount"
                  placeholderTextColor="#94a3b8"
                  value={feeAmount}
                  onChangeText={(text) => {
                    setFeeAmount(text);
                    if (errors.feeAmount) {
                      setErrors({ ...errors, feeAmount: null });
                    }
                  }}
                  keyboardType="decimal-pad"
                  editable={!isLoading}
                />
              </View>
              {errors.feeAmount && (
                <Text style={styles.errorText}>{errors.feeAmount}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter location"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={setLocation}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-add-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter reference"
                  placeholderTextColor="#94a3b8"
                  value={reference}
                  onChangeText={setReference}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Case Type</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="briefcase-outline" size={18} color="#3b82f6" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter case type"
                  placeholderTextColor="#94a3b8"
                  value={caseType}
                  onChangeText={setCaseType}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add any remarks or notes..."
                placeholderTextColor="#94a3b8"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={() => ref.current?.close()}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveButtonGradient, isLoading && styles.buttonDisabled]}
            >
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Appointment</Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* CALENDAR MODAL */}
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
                  current={appointmentDate || new Date().toISOString().split("T")[0]}
                  minDate={new Date().toISOString().split("T")[0]}
                  onDayPress={(day) => {
                    setAppointmentDate(day.dateString);
                    setIsCalendarOpen(false);
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
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

AddAppointmentSheet.displayName = "AddAppointmentSheet";

export default AddAppointmentSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#fff",
  },

  handleIndicator: {
    backgroundColor: "#e2e8f0",
    width: 40,
  },

  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 10,
  },

  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },

  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 4,
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },

  notesInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 100,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  buttonGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  buttonGroupError: {
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 8,
    padding: 4,
  },

  typeButton: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  typeButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },

  typeButtonError: {
    borderColor: "#ef4444",
  },

  typeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

  typeButtonTextActive: {
    color: "#fff",
  },

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#334155",
  },

  saveButtonGradient: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },

  saveButton: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },

  datePickerContent: {
    flex: 1,
  },

  datePickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 2,
  },

  datePickerValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
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
