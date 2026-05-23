import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen() {
  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        
        if (token) {
          router.replace("/(drawer)/punch");
        } else {
          router.replace("/(auth)/login");
        }
      } catch (error) {
        router.replace("/(auth)/login");
      }
    };

    checkAuthAndNavigate();
  }, []);

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#0f172a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
