import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import Register from "../app/Register";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import Toast from "react-native-root-toast";
import { API_URLS } from "../constants/constants";
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock SecureStore
jest.mock('expo-secure-store');
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Mock Toast
jest.mock("react-native-root-toast", () => ({
    show: jest.fn(),
}));

// Mock router
jest.mock('expo-router', () => ({
    router: {
      replace: jest.fn(),
      push: jest.fn(),
    },
}));

describe("Register Component", () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it("renders correctly", () => {
        const { getByPlaceholderText } = renderWithProviders(<Register />);
        expect(getByPlaceholderText("Name")).toBeTruthy();
        expect(getByPlaceholderText("Location")).toBeTruthy();
        expect(getByPlaceholderText("Email")).toBeTruthy();
        expect(getByPlaceholderText("Password")).toBeTruthy();
        expect(getByPlaceholderText("Confirm Password")).toBeTruthy();
    });

    it("shows validation errors when fields are empty", async () => {
        const { getByTestId, getAllByText } = renderWithProviders(<Register />);
        fireEvent.press(getByTestId("register-button"));

        await waitFor(() => {
            const requiredTexts = getAllByText("Required");
            expect(requiredTexts.length).toBeGreaterThan(0);
        });
    });

    it("shows error when passwords do not match", async () => {
        const { getByPlaceholderText, getByTestId, getByText } = renderWithProviders(<Register />);
        fireEvent.changeText(getByPlaceholderText("Password"), "password123");
        fireEvent.changeText(getByPlaceholderText("Confirm Password"), "password456");
        fireEvent.press(getByTestId("register-button"));

        await waitFor(() => {
            expect(getByText("Passwords must match")).toBeTruthy();
        });
    });

    it("submits form successfully", async () => {
        mockedAxios.post.mockResolvedValue({ status: 200 });
        mockedSecureStore.setItemAsync.mockResolvedValue();

        const { getByPlaceholderText, getByTestId } = renderWithProviders(<Register />);
        fireEvent.changeText(getByPlaceholderText("Name"), "John Doe");
        fireEvent.changeText(getByPlaceholderText("Location"), "New York");
        fireEvent.changeText(getByPlaceholderText("Email"), "john@example.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "password123");
        fireEvent.changeText(getByPlaceholderText("Confirm Password"), "password123");

        // Mock location verification step before registration
        mockedAxios.post.mockResolvedValueOnce({ data: { found: true } });
        
        fireEvent.press(getByTestId("register-button"));

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalled();
        });
    });

    it("shows error message on registration failure", async () => {
        // Mock the location verification request
        mockedAxios.post.mockResolvedValueOnce({ data: { found: true } }); // This is for the `verifyLocation` call
    
        // Mock the registration request to simulate failure
        mockedAxios.post.mockRejectedValueOnce({
            response: {
                data: {
                    messages: ["Registration failed. Does this email already have an account?"],
                },
            },
        });
    
        const { getByPlaceholderText, getByTestId, getByText } = renderWithProviders(<Register />);
    
        // Fill out the form
        fireEvent.changeText(getByPlaceholderText("Name"), "John Doe");
        fireEvent.changeText(getByPlaceholderText("Location"), "Nowehere");
        fireEvent.changeText(getByPlaceholderText("Email"), "john@example.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "password123");
        fireEvent.changeText(getByPlaceholderText("Confirm Password"), "password123");
    
        // Submit the form
        fireEvent.press(getByTestId("register-button"));
    
        // Assert that the location verification was called first
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith(
                `${API_URLS.VERIFY_LOCATION}?address=Nowehere`
            );
        });
    
        // Assert that the registration failure message is displayed
        await waitFor(() => {
            expect(getByText("Registration failed. This location isn't valid.") ).toBeTruthy();
        });
    });
});
