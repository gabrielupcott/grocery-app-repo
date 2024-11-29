import React, { useState, useEffect } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { Button, Text, Input, Toggle } from "@ui-kitten/components";
import { Formik, FormikHelpers } from "formik";
import * as Yup from "yup";
import axios, { AxiosError } from "axios";
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
  messages?: string[];
}

const RegisterSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Required"),
  confirmPassword: Yup.string().oneOf([Yup.ref("password")], "Passwords must match").required("Required"),
  name: Yup.string().required("Required"),
  location: Yup.string().required("Required"),
  role: Yup.number().required("Required"),
});

const Register: React.FC = () => {
  const [generalError, setGeneralError] = useState<string>("");
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null); // Track location validity
  const [locationError, setLocationError] = useState<string>("");

  const verifyLocation = async (location: string) => {
    try {
      const response = await axios.post(
        API_URLS.VERIFY_LOCATION + "?address=" + location
      );
      if (response.status === 200 && response.data.found) {
        setIsLocationValid(true);
        setLocationError("");
        return true;
      } else {
        setIsLocationValid(false);
        setLocationError("Location not found. Please enter a valid address.");
        return false;
      }
    } catch (error) {
      setIsLocationValid(false);
      setLocationError("Location verification failed. Please try a different address.");
      return false;
    }
  };

  const onSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setIsLocationValid(await verifyLocation(values.location)); // Reset location validation status

    if (!isLocationValid){
      if (!await verifyLocation(values.location)){
        setGeneralError("Registration failed. This location isn't valid.");
        console.error("Registration failed. This location isn't valid.");
        return;
      }
    } // Prevent submission if location is invalid
    else {
    try {
      const response = await axios.post(API_URLS.REGISTER, {
        username: values.email,
        email: values.email,
        password: values.password,
        role: values.role,
        location: values.location,
      }, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.status === 200) {
        await SecureStore.setItemAsync("userName", values.name);
        await SecureStore.setItemAsync("userEmail", values.email);

        Toast.show("Verification successful! Please Login", { duration: Toast.durations.LONG });
        router.push({ pathname: '/Login', params: { registrationSuccess: "true" } });
      }
    } catch (error) {
      setGeneralError("Registration failed. Does this account already exist?");
      console.error("Registration failed:", error);
    } finally {
      setSubmitting(false);
    }
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
          role: 1,
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
            <Text category="h2" style={{ textAlign: "center" }}>Register</Text>
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
              onChangeText={(text) => {
                setFieldValue("location", text);
                setIsLocationValid(null); // Reset validation status
                // verifyLocation(text); // Trigger verification on change
              }}
              onBlur={handleBlur("location")}
              style={styles.input}
              status={!isLocationValid && values.location ? "danger" : "basic"}
              caption={locationError || (touched.location && errors.location ? errors.location : "")}
            />
            <Input
              placeholder="Email"
              value={values.email}
              onChangeText={handleChange("email")}
              onBlur={handleBlur("email")}
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
              status={touched.confirmPassword && errors.confirmPassword ? "danger" : "basic"}
              caption={touched.confirmPassword && errors.confirmPassword ? errors.confirmPassword : ""}
              secureTextEntry
            />
            {/* <Toggle
              style={styles.toggle}
              checked={values.role === 2}
              onChange={(checked) => setFieldValue("role", checked ? 2 : 1)}
            >
              {`Role: ${values.role === 2 ? "Admin" : "User"}`}
            </Toggle> */}
            {generalError ? <Text style={styles.errorText}>{generalError}</Text> : null}
            <Button
              style={styles.submitButton}
              onPress={(event) => handleSubmit()}
              disabled={isSubmitting} // Disable button if location is invalid
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
