import React from "react";
import { SafeAreaView, View, StyleSheet, Alert } from "react-native";
import { Button, Text, Input, Toggle } from "@ui-kitten/components";
import { Formik, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios, { AxiosError, AxiosResponse } from "axios";
import { useState } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URLS } from "../constants/constants";
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import Toast from "react-native-root-toast";

interface FormValues {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  location: string;
  role: number;
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

const RegisterSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Required"),
  name: Yup.string().required("Required"),
  location: Yup.string().required("Required"),
  role: Yup.number().required("Required"),
});

const Register: React.FC = () => {
  const [generalError, setGeneralError] = useState<string>("");

  const onSubmit = async (
    values: FormValues,
    { setSubmitting, setFieldError }: FormikHelpers<FormValues>
  ) => {
    try {
      console.log("Registering with values:", values);
      if (values.email === "" || values.password === "" || values.name === "" || values.location === "") {
        setGeneralError("Please fill in all fields.");
        setSubmitting(false);
        return;
      }
      const response = await axios.post(
        API_URLS.REGISTER,
        {
          username: values.email,
          email: values.email,
          password: values.password,
          role: values.role,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.status === 200) {
        // Store Name, Location, and Email in Secure Store
        await SecureStore.setItemAsync("userName", values.name);
        await SecureStore.setItemAsync("userLocation", values.location);
        await SecureStore.setItemAsync("userEmail", values.email);

        // Display success toast
        Toast.show("Verification successful! Please Login", {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          shadow: true,
          animation: true,
          hideOnPress: true,
          delay: 0,
        });

        router.push("/Login");

      }
    } catch (error) {
      const axiosError = error as CustomAxiosError;
      if (axiosError.response) {
        const errorMessage = axiosError.response.data.messages
          ? axiosError.response.data.messages.join("\n")
          : "Registration failed. Does this email already have an account?";
        setGeneralError(errorMessage);
      } else {
        setGeneralError("An unknown error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Formik
        initialValues={{
          email: "",
          password: "",
          confirmPassword: "",
          name: "",
          location: "",
          role: 1, // Default role value
        }}
        validationSchema={RegisterSchema}
        onSubmit={onSubmit}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          isSubmitting,
          setFieldValue,
          isValid,
        }) => (
          <View style={styles.form}>
            <Text category="h2" style={{ textAlign: "center" }}>
              Register
            </Text>
            <Input
              placeholder="Name"
              value={values.name}
              onChangeText={handleChange("name")}
              onBlur={handleBlur("name")}
              style={styles.input}
              status={touched.name && errors.name ? "danger" : "basic"}
              caption={touched.name && errors.name ? errors.name : ""}
            />
            <Input
              placeholder="Location"
              value={values.location}
              onChangeText={handleChange("location")}
              onBlur={handleBlur("location")}
              style={styles.input}
              status={touched.location && errors.location ? "danger" : "basic"}
              caption={touched.location && errors.location ? errors.location : ""}
            />
            <Input
              placeholder="Email"
              value={values.email}
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
              testID="email-field"
              style={styles.input}
              status={touched.email && errors.email ? "danger" : "basic"}
              caption={touched.email && errors.email ? errors.email : ""}
            />
            <Input
              placeholder="Password"
              value={values.password}
              onChangeText={handleChange("password")}
              onBlur={handleBlur("password")}
              style={styles.input}
              status={touched.password && errors.password ? "danger" : "basic"}
              caption={touched.password && errors.password ? errors.password : ""}
              secureTextEntry
            />
            <Input
              placeholder="Confirm Password"
              value={values.confirmPassword}
              onChangeText={handleChange("confirmPassword")}
              onBlur={handleBlur("confirmPassword")}
              style={styles.input}
              status={
                touched.confirmPassword && errors.confirmPassword ? "danger" : "basic"
              }
              caption={
                touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : ""
              }
              secureTextEntry
            />
            <Toggle
              style={styles.toggle}
              checked={values.role === 2}
              onChange={(checked) => setFieldValue("role", checked ? 2 : 1)}
            >
              {`Role: ${values.role === 2 ? "Admin" : "User"}`}
            </Toggle>
            {generalError ? (
              <Text style={styles.errorText}>{generalError}</Text>
            ) : null}
            <Button
              style={styles.submitButton}
              onPress={() => {
                console.log("Form isValid status: ", isValid);
                console.log(values);
                isValid && handleSubmit();
              }}
              disabled={isSubmitting}
              appearance="outline"
              testID="register-button"
            >
              Register
            </Button>
          </View>
        )}
      </Formik>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  form: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    marginVertical: 8,
  },
  toggle: {
    marginVertical: 16,
  },
  submitButton: {
    marginTop: 24,
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginVertical: 8,
  },
});

export default Register;