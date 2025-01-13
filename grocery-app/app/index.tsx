import { SafeAreaView, View, StyleSheet, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { Button, Text } from "@ui-kitten/components";
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';

const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Image Section */}
        <Image
          source={require('../assets/images/landing-icon.png')} // Update with the actual path to your image file
          style={styles.image}
        />
        {/* Title Section */}
        <Text style={styles.title} category="h1">
          Grocery App
        </Text>
        {/* Description Section */}
        <Text style={styles.description}>
          Track your current stock of food, create and manage shopping lists and find deals
        </Text>
        {/* Get Started Button */}
        <Button
          onPress={() => router.push("/Register")}
          style={styles.button}
          appearance="outline"
        >
          Get Started
        </Button>
        {/* Footer with Login Link */}
        <View style={styles.footer}>
          <Text>Already have an account? </Text>
          <Text
            style={styles.loginLink}
            onPress={() => router.push("/Login")}
          >
            Log In
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Landing;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: 100, // Adjust based on your image size
    height: 100, // Adjust based on your image size
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: 'gray',
    paddingHorizontal: 20,
  },
  button: {
    width: '60%',
    borderColor: 'black',
    borderWidth: 1,
    backgroundColor: 'white',
    marginBottom: 20,  
    color: 'black',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginLink: {
    color: '#1e90ff', // Blue color for the link
  },
});
