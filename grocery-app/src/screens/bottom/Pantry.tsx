import { SafeAreaView, View, StyleSheet, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Button } from "@ui-kitten/components";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError, AxiosResponse } from "axios";
import { API_URLS } from "../../api/constants"; // Assuming you have a constants file

const Pantry: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const layout = useWindowDimensions();
  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const storedUserName = await AsyncStorage.getItem("userName");
      const storedToken = await AsyncStorage.getItem("token");
      setUserName(storedUserName);
      setToken(storedToken);
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem("userName");
    await AsyncStorage.removeItem("token");
    navigation.navigate("Login");
  };

  const tryProtectedRoute = async () => {
    try {
      const response = await axios.get(API_URLS.PROTECTED_ROUTE, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Protected route response:", response);
    } catch (error) {
      console.error("Protected route error:", error);
    }
  }

  return (
    <ScrollView >
      <View style={styles.container}>
        {userName && token ? (
          <>
            <Text category="s1">Welcome, {userName}!</Text>
            <Text category="s2">Your authentication token is:</Text>
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenText}>{token}</Text>
            </View>
            <Button onPress={tryProtectedRoute} style={styles.button}>
              Try protected route
            </Button>
            <Button onPress={handleLogout} style={styles.button}>
              Logout
            </Button>
          </>
        ) : (
          <Text>Loading user data...</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "white",
    borderTopWidth: 0,
    marginTop: -10,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  tokenContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    width: '100%',
  },
  tokenText: {
    textAlign: "center",
  },
  button: {
    marginTop: 20,
  },
});

export default Pantry;
