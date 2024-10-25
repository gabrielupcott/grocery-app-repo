import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import axios from "axios";
import Login from "../app/Login";
import * as SecureStore from 'expo-secure-store';
import { API_URLS } from "../constants/constants";
import { router } from 'expo-router';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('expo-router', () => ({
    router: {
        replace: jest.fn(),
    },
    useLocalSearchParams: jest.fn(() => ({
        registrationSuccess: true, // Mocking registrationSuccess to simulate the parameter
    })),
}));
jest.mock('react-native-root-toast', () => ({
    show: jest.fn(), // Mock Toast show function
}));


describe("Login", () => {

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it("renders correctly", () => {
        const { getByPlaceholderText, getByText } = renderWithProviders(<Login />);
        expect(getByPlaceholderText("Email")).toBeTruthy();
        expect(getByPlaceholderText("Password")).toBeTruthy();
        expect(getByText("Sign In")).toBeTruthy();
    });

    it("shows validation errors when fields are empty", async () => {
        const { getByText, getAllByText } = renderWithProviders(<Login />);
        fireEvent.press(getByText("Sign In"));

        await waitFor(() => {
            const requiredMessaged = getAllByText("Required");
            expect(requiredMessaged.length).toBeGreaterThan(0);
        });
    });

    it("shows validation error for invalid email", async () => {
        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText("Email"), "invalid-email");
        fireEvent.press(getByText("Sign In"));

        await waitFor(() => {
            expect(getByText("Invalid email")).toBeTruthy();
        });
    });

    it("shows validation error for short password", async () => {
        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText("Password"), "123");
        fireEvent.press(getByText("Sign In"));

        await waitFor(() => {
            expect(getByText("Password must be at least 6 characters")).toBeTruthy();
        });
    });

    it("logs in successfully and navigates to the home screen", async () => {
        const mockResponse = {
            data: {
                access_token: "mock-token",
            },
            status: 200,
        };

        const mockUserIdResponse = {
            data: {
                user_id: "mock-user-id",
            },
        };

        (axios.post as jest.Mock).mockResolvedValue(mockResponse);
        (axios.get as jest.Mock).mockResolvedValue(mockUserIdResponse);

        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText("Email"), "gabrielcupcott@gmail.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "Password1!");
        fireEvent.press(getByText("Sign In"));

        await waitFor(() => {
            expect(SecureStore.setItemAsync).toHaveBeenCalled();
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith("userName", "gabrielcupcott@gmail.com");
            expect(SecureStore.setItemAsync).toHaveBeenCalled();
            expect(router.replace).toHaveBeenCalledWith('/(tabs)');
        });
    });

    it("shows general error message on login failure", async () => {
        const mockError = {
            response: {
                data: {
                    messages: ["Invalid credentials"],
                },
            },
        };

        (axios.post as jest.Mock).mockRejectedValue(mockError);

        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
        fireEvent.changeText(getByPlaceholderText("Password"), "wrongpassword");
        fireEvent.press(getByText("Sign In"));

        await waitFor(() => {
            expect(getByText("Invalid credentials")).toBeTruthy();
        });
    });

    it("shows general error message on API timeout", async () => {
        const mockTimeoutError = {
            code: 'ECONNABORTED',
            message: 'timeout of 5000ms exceeded',
        };
    
        // Mock axios to simulate timeout error
        (axios.get as jest.Mock).mockRejectedValue(mockTimeoutError);
    
        const { getByText } = renderWithProviders(<Login />);
    
        // Wait for the error message to appear
        await waitFor(() => {
            expect(getByText("API request timed out. Please try again.")).toBeTruthy();
        });
    });
});