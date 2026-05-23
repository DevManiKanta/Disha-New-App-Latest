import { forwardRef, useCallback, useMemo, useState } from "react";

import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";

import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { addClient } from "../../services/api/clientService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

const AddClientSheet = forwardRef((props, ref) => {
  const snapPoints = useMemo(() => ["90%"], []);

  const [callType, setCallType] = useState("Incoming");
  const [leadType, setLeadType] = useState("Warm");
  const [focusedField, setFocusedField] = useState(null);
  const [reference, setReference] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [caseType, setCaseType] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const SheetTextInput = Platform.OS === "web" ? TextInput : BottomSheetTextInput;

  const handleFocus = useCallback((fieldName) => {
    setFocusedField(fieldName);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullname = "Full name is required";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (phone.trim().length < 10) {
      newErrors.phone = "Phone number must be at least 10 digits";
    }

    if (!location.trim()) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setCallType("Incoming");
    setLeadType("Warm");
    setFullName("");
    setPhone("");
    setLocation("");
    setReference("");
    setCaseType("");
    setRemarks("");
    setErrors({});
  };

  const handleSaveClient = async () => {
    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      showErrorToast("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const clientData = {
        call_type: callType.toLowerCase(),
        lead_type: leadType.toLowerCase(),
        fullname: fullName,
        phone: phone,
        location: location,
        referance: reference,
        case_type: caseType,
        remarks: remarks,
      };

      const result = await addClient(clientData);

      if (result.success) {
        showSuccessToast(result.message || "Client added successfully!");

        // Reset form
        resetForm();

        // Close sheet after a short delay
        setTimeout(() => {
          ref?.current?.close();
        }, 500);

        // Call onClientAdded callback if provided
        props?.onClientAdded?.(result.data.data);
      } else {
        // Handle validation errors
        if (result.validationErrors && Object.keys(result.validationErrors).length > 0) {
          setErrors(result.validationErrors);
          const firstError = Object.values(result.validationErrors)[0];
          showErrorToast(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          showErrorToast(result.message || "Failed to add client");
        }
      }
    } catch (error) {
      showErrorToast("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add New Client</Text>
          <Text style={styles.subtitle}>Fill in the details below</Text>
          <View style={styles.headerDivider} />
        </View>

        {/* CALL TYPE */}
        <View style={styles.section}>
          <Text style={styles.label}>Call Type</Text>

          <View style={styles.row}>
            {["Incoming", "Outgoing"].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.optionButton,
                  callType === item && styles.activeButton,
                ]}
                onPress={() => setCallType(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item === "Incoming" ? "arrow-down" : "arrow-up"}
                  size={16}
                  color={callType === item ? "#fff" : "#6b7280"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.optionText,
                    callType === item && styles.activeText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* LEAD TYPE */}
        <View style={styles.section}>
          <Text style={styles.label}>Lead Type</Text>

          <View style={styles.row}>
            {["Cold", "Warm", "Hot"].map((item) => {
              const isSelected = leadType === item;
              let buttonStyle = [styles.optionButton];
              if (isSelected) {
                if (item === "Cold") buttonStyle.push(styles.activeButtonCold);
                else if (item === "Warm")
                  buttonStyle.push(styles.activeButtonWarm);
                else if (item === "Hot")
                  buttonStyle.push(styles.activeButtonHot);
              }
              return (
                <TouchableOpacity
                  key={item}
                  style={buttonStyle}
                  onPress={() => setLeadType(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={
                      item === "Cold"
                        ? "snow-outline"
                        : item === "Warm"
                          ? "sunny"
                          : "flame"
                    }
                    size={16}
                    color={isSelected ? "#fff" : "#6b7280"}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[styles.optionText, isSelected && styles.activeText]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* FULL NAME */}
        <View style={styles.section}>
          <Text style={styles.label}>Full Name *</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === "name" && styles.inputContainerFocused,
              errors.fullname && styles.inputContainerError,
            ]}
          >
            <Ionicons
              name="person"
              size={18}
              color={errors.fullname ? "#ef4444" : focusedField === "name" ? "#3b82f6" : "#9ca3af"}
              style={styles.inputIcon}
            />
            <SheetTextInput
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullname) {
                  setErrors({ ...errors, fullname: null });
                }
              }}
              placeholder="Rahul Sharma"
              placeholderTextColor="#d1d5db"
              style={styles.input}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              caretHidden={false}
              editable={!isLoading}
              onFocus={() => handleFocus("name")}
              onBlur={handleBlur}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          {errors.fullname && (
            <Text style={styles.errorText}>{errors.fullname}</Text>
          )}
        </View>

        {/* PHONE */}
        <View style={styles.section}>
          <Text style={styles.label}>Phone *</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === "phone" && styles.inputContainerFocused,
              errors.phone && styles.inputContainerError,
            ]}
          >
            <Ionicons
              name="call"
              size={18}
              color={errors.phone ? "#ef4444" : focusedField === "phone" ? "#3b82f6" : "#9ca3af"}
              style={styles.inputIcon}
            />
            <SheetTextInput
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) {
                  setErrors({ ...errors, phone: null });
                }
              }}
              placeholder="+91 98765 43210"
              placeholderTextColor="#d1d5db"
              keyboardType="phone-pad"
              style={styles.input}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              caretHidden={false}
              editable={!isLoading}
              onFocus={() => handleFocus("phone")}
              onBlur={handleBlur}
            />
          </View>
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        {/* LOCATION */}
        <View style={styles.section}>
          <Text style={styles.label}>Location *</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === "location" && styles.inputContainerFocused,
              errors.location && styles.inputContainerError,
            ]}
          >
            <Ionicons
              name="location"
              size={18}
              color={errors.location ? "#ef4444" : focusedField === "location" ? "#3b82f6" : "#9ca3af"}
              style={styles.inputIcon}
            />
            <SheetTextInput
              value={location}
              onChangeText={(text) => {
                setLocation(text);
                if (errors.location) {
                  setErrors({ ...errors, location: null });
                }
              }}
              placeholder="Mumbai, MH"
              placeholderTextColor="#d1d5db"
              style={styles.input}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              caretHidden={false}
              editable={!isLoading}
              onFocus={() => handleFocus("location")}
              onBlur={handleBlur}
            />
          </View>
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>

        {/* REFERENCE */}
        <View style={styles.section}>
          <Text style={styles.label}>Reference</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === "reference" && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="people"
              size={18}
              color={focusedField === "reference" ? "#3b82f6" : "#9ca3af"}
              style={styles.inputIcon}
            />
            <SheetTextInput
              placeholder="Referred by / Source"
              placeholderTextColor="#d1d5db"
              style={styles.input}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              value={reference}
              onChangeText={setReference}
              onFocus={() => handleFocus("reference")}
              onBlur={handleBlur}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* CASE TYPE */}
        <View style={styles.section}>
          <Text style={styles.label}>Case Type</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === "caseType" && styles.inputContainerFocused,
            ]}
          >
            <Ionicons
              name="briefcase"
              size={18}
              color={focusedField === "caseType" ? "#3b82f6" : "#9ca3af"}
              style={styles.inputIcon}
            />
            <SheetTextInput
              value={caseType}
              onChangeText={setCaseType}
              placeholder="Select case type"
              placeholderTextColor="#d1d5db"
              style={styles.input}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              caretHidden={false}
              editable={!isLoading}
              onFocus={() => handleFocus("caseType")}
              onBlur={handleBlur}
            />
          </View>
        </View>

        {/* REMARKS */}
        <View style={styles.section}>
          <Text style={styles.label}>Remarks</Text>
          <View
            style={[
              styles.textAreaContainer,
              focusedField === "remarks" && styles.textAreaContainerFocused,
            ]}
          >
            <SheetTextInput
              multiline
              numberOfLines={4}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add any additional notes..."
              placeholderTextColor="#d1d5db"
              style={styles.textArea}
              cursorColor="#3b82f6"
              selectionColor="#bfdbfe"
              caretHidden={false}
              editable={!isLoading}
              onFocus={() => handleFocus("remarks")}
              onBlur={handleBlur}
            />
          </View>
        </View>

        {/* SAVE */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.buttonDisabled]}
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={handleSaveClient}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <View style={styles.buttonTextContainer}>
                  <Text style={styles.saveLabel}>Save Client</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddClientSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  handle: {
    paddingTop: 10,
  },

  handleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    marginBottom: 26,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },

  headerDivider: {
    marginTop: 18,
    height: 1,
    backgroundColor: "#f1f5f9",
  },

  section: {
    marginBottom: 22,
  },

  label: {
    marginBottom: 12,
    fontWeight: "700",
    fontSize: 13,
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 56,
  },

  inputContainerFocused: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },

  inputContainerError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },

  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },

  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    color: "#0f172a",
    fontSize: 15.5,
    fontWeight: "600",
    padding: 0,
  },

  textAreaContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 140,
  },

  textAreaContainerFocused: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },

  textArea: {
    color: "#0f172a",
    fontSize: 15.5,
    fontWeight: "600",
    textAlignVertical: "top",
    padding: 0,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  optionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
  },

  activeButton: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },

  activeButtonCold: {
    backgroundColor: "#06b6d4",
    borderColor: "#06b6d4",
  },

  activeButtonWarm: {
    backgroundColor: "#f59e0b",
    borderColor: "#f59e0b",
  },

  activeButtonHot: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },

  optionText: {
    fontWeight: "700",
    fontSize: 14,
    color: "#64748b",
  },

  activeText: {
    color: "#fff",
  },

  saveButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  saveLabel: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    opacity: 0.9,
  },

  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 28,
    marginBottom: 20,
  },

  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  buttonTextContainer: {
    alignItems: "flex-start",
  },

  secondaryLabel: {
    color: "#3b82f6",
    fontWeight: "800",
    fontSize: 13,
  },

  secondaryText: {
    color: "#3b82f6",
    fontWeight: "600",
    fontSize: 12,
    opacity: 0.8,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 26,
  },
});
