import React, { useState } from "react";
import { SafeAreaView, View, StyleSheet } from "react-native";
import { Button, Text } from "@ui-kitten/components";
import axios, { AxiosError, AxiosResponse } from "axios";
import { Formik, FormikHelpers } from "formik";
import { CodeField, Cursor, useBlurOnFulfill, useClearByFocusCell } from "react-native-confirmation-code-field";
import * as Yup from "yup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URLS } from "../../api/constants";

interface FormValues {
  code: string;
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
  code: Yup.string().length(6, "Code must be 6 characters").required("Required"),
});
const CELL_COUNT = 6;

const Verify: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [resent, setResent] = useState(false);
  const [generalError, setGeneralError] = useState<string>("");
  const [value, setValue] = useState("");
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const onSubmit = async (
    values: FormValues,
    { setSubmitting, setFieldError }: FormikHelpers<FormValues>
  ) => {
    try {
      const email = await AsyncStorage.getItem("userName");

      if (!email) {
        setGeneralError("Email not found. Please register again.");
        setSubmitting(false);
        return;
      }

      const response = await axios.post(
        API_URLS.CONFIRM_REGISTRATION,
        {
          username: email,
          confirmation_code: values.code,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Verification successful:", response.data);

      // Redirect to login screen
      navigation.navigate("Login");

      // // Automatically log in after successful verification
      // const loginResponse = await axios.post(
      //   API_URLS.LOGIN,
      //   {
      //     username: email,
      //     password: await AsyncStorage.getItem("userPassword"),
      //   },
      //   {
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //   }
      // );

      // const token = loginResponse.data.access_token;

      // await AsyncStorage.setItem("token", token);

      // setSubmitting(false);
      // navigation.navigate("Main");
    } catch (error) {
      const axiosError = error as CustomAxiosError;
      if (axiosError.response) {
        const errorMessage = axiosError.response.data.messages
          ? axiosError.response.data.messages.join("\n")
          : "Verification failed. Please try again.";
        setGeneralError(errorMessage);
      } else {
        setGeneralError("An unknown error occurred. Please try again.");
      }
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    console.log("Resend code not currently implemented");
    // try {
    //   const email = await AsyncStorage.getItem("userName");

    //   if (!email) {
    //     setGeneralError("Email not found. Please register again.");
    //     return;
    //   }

    //   const response = await axios.post(
    //     API_URLS.RESEND_CODE,
    //     {
    //       username: email,
    //     },
    //     {
    //       headers: {
    //         "Content-Type": "application/json",
    //       },
    //     }
    //   );

    //   console.log("Resend successful:", response.data);
    //   setResent(true);
    // } catch (error) {
    //   const axiosError = error as CustomAxiosError;
    //   console.error("Resend error:", axiosError);

    //   if (axiosError.response) {
    //     const errorMessage = axiosError.response.data.messages
    //       ? axiosError.response.data.messages.join("\n")
    //       : "Resend code failed. Please try again.";
    //     setGeneralError(errorMessage);
    //   } else {
    //     setGeneralError("An unknown error occurred. Please try again.");
    //   }
    // }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title} category="h1">
          CrowdVision
        </Text>
        <Text style={styles.subtitle} category="h2">
          Enter your verification code:
        </Text>
        {generalError ? (
          <Text style={styles.generalError}>{generalError}</Text>
        ) : null}
        <Formik
          initialValues={{ code: "" }}
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
              <CodeField
                ref={ref}
                {...props}
                value={values.code}
                onChangeText={handleChange("code")}
                cellCount={CELL_COUNT}
                rootStyle={styles.codeFieldRoot}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                renderCell={({ index, symbol, isFocused }) => (
                  <Text
                    key={index}
                    style={[
                      styles.cell,
                      isFocused && styles.focusCell,
                    ]}
                    onLayout={getCellOnLayoutHandler(index)}
                  >
                    {isFocused ? <Cursor /> : symbol}
                  </Text>
                )}
              />

              <Button
                onPress={() => handleSubmit()}
                style={styles.button}
                status="primary"
              >
                Verify
              </Button>
            </>
          )}
        </Formik>

        <View style={styles.bottomContainer}>
          <Text style={{ marginRight: 5 }}>Didn't get a code?</Text>
          <Button
            appearance="ghost"
            status="primary"
            onPress={onResend}
            disabled={resent}
          >
            {resent ? "Code Resent" : "Resend code"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Verify;

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
  codeFieldRoot: {
    marginTop: 20,
    marginBottom: 20,
  },
  cell: {
    width: 60,
    height: 60,
    lineHeight: 58,
    fontSize: 24,
    borderWidth: 2,
    borderColor: "#d3d3d3",
    textAlign: "center",
  },
  focusCell: {
    borderColor: "#000",
  },
});
