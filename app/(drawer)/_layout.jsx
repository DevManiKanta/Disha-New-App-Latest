import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, {
  FadeInLeft,
  FadeInDown,
} from "react-native-reanimated";
import { router } from "expo-router";
import { logout } from "../../services/api/authService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

function CustomDrawerContent(props) {
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        showSuccessToast(result.message);
        router.replace("/(auth)/login");
      } else {
        showErrorToast(result.message);
      }
    } catch (error) {
      showErrorToast("Error during logout");
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={styles.safeArea}
    >
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[
          styles.drawerContent,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* HEADER SECTION */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.headerSection}
        >
          {/* <View style={styles.logoBox}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="briefcase-outline"
                size={28}
                color="#3b82f6"
              />
            </View>
          </View> */}

          <Animated.View
            style={styles.brandText}
            entering={FadeInLeft.duration(700).delay(100)}
          >
            <Text style={styles.appName}>Disha Law</Text>
            <Text style={styles.tagline}>Clients • Calls • Appointments</Text>
          </Animated.View>
        </Animated.View>

        {/* MENU SECTION */}
        <Animated.View
          style={styles.drawerList}
          entering={FadeInLeft.duration(800).delay(100)}
        >
          <Text style={styles.sectionLabel}>Menu</Text>
          <DrawerItemList {...props} />
        </Animated.View>

        {/* FOOTER SECTION */}
        <Animated.View
          style={styles.drawerFooter}
          entering={FadeInLeft.duration(800).delay(200)}
        >
          <View style={styles.footerCard}>
            <View style={styles.footerIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#10b981"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerTitle}>Secure & Private</Text>
              <Text style={styles.footerSub}>
                Your data is encrypted locally
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.footerVersion}>FirstApp v1.0.0</Text>
        </Animated.View>
      </DrawerContentScrollView>
    </SafeAreaView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent {...props} />
      )}
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "left",
        headerStyle: {
          backgroundColor: "#f8fafc",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        },
        headerTitleStyle: {
          fontWeight: "900",
          color: "#0f172a",
          fontSize: 18,
        },
        headerTintColor: "#0f172a",
        headerShadowVisible: false,
        sceneContainerStyle: {
          backgroundColor: "#f8fafc",
        },
        drawerType: "slide",
        drawerStyle: {
          backgroundColor: "#ffffff",
          width: 280,
        },
        drawerActiveTintColor: "#3b82f6",
        drawerInactiveTintColor: "#64748b",
        drawerActiveBackgroundColor: "#eff6ff",
        drawerLabelStyle: {
          fontWeight: "700",
          fontSize: 15,
          marginLeft: -8,
        },
        drawerItemStyle: {
          borderRadius: 10,
          marginHorizontal: 10,
          marginVertical: 6,
          paddingHorizontal: 14,
          paddingVertical: 14,
        },
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: "Home",
          drawerLabel: "Home",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="home-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="punch"
        options={{
          title: "Punch In/Out",
          drawerLabel: "Punch In/Out",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="log-in-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="attendance"
        options={{
          title: "Attendance Sheet",
          drawerLabel: "Attendance Sheet",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="calendar-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="clients"
        options={{
          title: "Clients",
          drawerLabel: "Clients",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="people-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="followups"
        options={{
          title: "Follow-ups",
          drawerLabel: "Follow-ups",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="chatbubbles-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="appointments"
        options={{
          title: "Appointments",
          drawerLabel: "Appointments",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="calendar-outline"
              color={color}
              size={24}
            />
          ),
        }}
      />

      {/* HIDDEN SCREENS - Not shown in drawer */}
      <Drawer.Screen
        name="reports"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Reports",
        }}
      />

      {/* HIDDEN DETAIL SCREENS - Not shown in drawer */}
      <Drawer.Screen
        name="appointments/[id]"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Appointment Details",
        }}
      />

      <Drawer.Screen
        name="clients/[id]"
        options={{
          drawerItemStyle: { display: "none" },
          title: "Client Details",
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  drawerContent: {
    flexGrow: 1,
    paddingTop: 0,
  },

  headerSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 12,
  },

  logoBox: {
    marginBottom: 14,
  },

  logoCircle: {
    height: 52,
    width: 52,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },

  brandText: {
    gap: 4,
  },

  appName: {
    color: "#0f172a",
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: 0.3,
  },

  tagline: {
    color: "#64748b",
    fontWeight: "500",
    fontSize: 12.5,
  },

  drawerList: {
    paddingTop: 4,
    paddingHorizontal: 0,
  },

  sectionLabel: {
    marginLeft: 16,
    marginBottom: 14,
    marginTop: 8,
    color: "#94a3b8",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  drawerFooter: {
    marginTop: "auto",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },

  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  footerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
  },

  footerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },

  footerSub: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 2,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 14,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
  },

  footerVersion: {
    fontSize: 11,
    color: "#cbd5e1",
    fontWeight: "700",
    textAlign: "center",
  },
});