import React, { useEffect, useState } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { Button, Text, Input } from "@ui-kitten/components";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Formik, FormikHelpers } from "formik";
import * as Yup from "yup";
import { API_URLS } from "../constants/constants"; // Assuming you have a constants file
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from "react-native-root-toast"; // Import Toast
import { useAuth } from '../context/AuthContext';

interface FormValues {
  username: string;
  password: string;
}

interface CustomError {
  code?: number;
  data?: null;
  lang?: string;
  messages?: string[];
  redirectUrl?: null;
  success?: boolean;
}

interface CustomAxiosError extends AxiosError {
  response?: AxiosResponse<CustomError>;
}

const LoginSchema = Yup.object().shape({
  username: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Required"),
});

const Login: React.FC = () => {
  const [generalError, setGeneralError] = useState<string>("");
  const { registrationSuccess } = useLocalSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    if (registrationSuccess === "true") {
      Toast.show("Registration successful! Please log in.", {
        duration: Toast.durations.LONG,
        position: Toast.positions.BOTTOM,
        shadow: true,
        animation: true,
        hideOnPress: true,
      });
    }
  }, [registrationSuccess]);

  const testAPI = async () => {
    try {
      const response = await axios.get(`${API_URLS.API_TEST}`, { timeout: 5000 });
      console.log("API Test response:", response);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        setGeneralError("API request timed out. Please try again.");
      } else {
        setGeneralError("An error occurred while connecting to the API: " + axiosError.message + " " + axiosError.code);
      }
      console.error("API Test error:", error);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  const onSubmit = async (
    values: FormValues,
    { setSubmitting, setFieldError }: FormikHelpers<FormValues>
  ) => {
    try {
      await login(values.username, values.password);
    } catch (error) {
      const axiosError = error as CustomAxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        setGeneralError("Request timed out. Please try again.");
      } else if (axiosError.response?.data?.messages) {
        const errorMessage = axiosError.response.data.messages[0];
        setGeneralError(errorMessage);
      } else {
        console.error("Login error:", axiosError);
        setGeneralError("Error: " + axiosError.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title} category="h1">Login</Text>

        {registrationSuccess === "true" && (
          <Text style={styles.subtitle}>Registration successful! Please log in.</Text>
        )}

        {generalError.length > 0 ? (
          <Text style={styles.generalError}>{generalError}</Text>
        ) : null}

        <Formik
          initialValues={{ username: "", password: "" }}
          validationSchema={LoginSchema}
          onSubmit={onSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            touched,
            errors,
          }) => (
            <>
              <Input
                onChangeText={handleChange("username")}
                onBlur={handleBlur("email")}
                value={values.username}
                placeholder="Email"
                style={styles.input}
                status={touched.username && errors.username ? "danger" : "basic"}
                caption={touched.username && errors.username ? errors.username : ""}
              />

              <Input
                onChangeText={handleChange("password")}
                onBlur={handleBlur("password")}
                value={values.password}
                placeholder="Password"
                style={styles.input}
                secureTextEntry={true}
                status={touched.password && errors.password ? "danger" : "basic"}
                caption={touched.password && errors.password ? errors.password : ""}
              />

              <Button
                onPress={() => handleSubmit()}
                style={styles.button}
                status="primary"
                appearance="outline"
              >
                Sign In
              </Button>
            </>
          )}
        </Formik>

        <View style={styles.bottomContainer}>
          <Text>Don't have an account?</Text>
          <Button
            appearance="ghost"
            status="primary"
            onPress={() => router.replace('/Register')}
          >
            Sign Up
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: 20,
  },
  title: {
    textAlign: "center",
    marginBottom: "5%",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: "10%",
    fontSize: 16,
  },
  input: {
    marginBottom: "5%",
    width: "75%",
  },
  button: {
    width: "50%",
    alignSelf: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  generalError: {
    color: "red",
    marginBottom: 10,
  },
});
