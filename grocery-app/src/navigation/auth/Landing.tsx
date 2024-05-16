import { SafeAreaView, View, StyleSheet } from "react-native";
import React from "react";
import { Button, Text } from "@ui-kitten/components";

const Landing: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView>
      <View style={styles.container}>
        <Text style={styles.title} category="h1">
          Grocery App
        </Text>
        <Button
          onPress={() => navigation.navigate("Login")}
          style={styles.button}
        >
          Login
        </Button>
        <Button
          onPress={() => navigation.navigate("Register")}
          style={styles.button}
        >
          Sign Up
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default Landing;

const styles = StyleSheet.create({
  container: {
    alignContent: "center",
    justifyContent: "center",
    marginTop: "75%",
    textAlign: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: "10%",
  },
  button: {
    width: "50%",
    alignSelf: "center",
    fontFamily: "Poppins-Medium",
    marginBottom: "5%",
  },
});
