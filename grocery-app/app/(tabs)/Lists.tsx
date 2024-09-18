import { View, StyleSheet, ScrollView } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Button } from "@ui-kitten/components";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';

const Lists: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const layout = useWindowDimensions();
  const [userName, setUserName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const storedUserName = await SecureStore.getItemAsync("userName");
      const storedToken = await SecureStore.getItemAsync("token");
      setUserName(storedUserName);
      setToken(storedToken);
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("userName");
    await SecureStore.deleteItemAsync("token");
    navigation.navigate("Login");
  };

  return (
    <ScrollView >
      <SafeAreaView style={styles.container}>
        {userName && token ? (
          <>
            <Text category="s1">Lists Page for: {userName}</Text>
          </>
        ) : (
          <Text>Loading user data...</Text>
        )}
      </SafeAreaView>
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

export default Lists;
