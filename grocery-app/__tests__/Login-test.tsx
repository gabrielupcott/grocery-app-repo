import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import Login from '../app/Login';
import * as SecureStore from 'expo-secure-store';
import { API_URLS } from '../constants/constants';
import { router } from 'expo-router';
import { ApplicationProvider } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';
import { withDelay } from 'react-native-reanimated';

jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
    },
}));

describe('Login', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = renderWithProviders(<Login />);
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
        expect(getByText('Sign In')).toBeTruthy();
        expect(getByText("Don't have an account?")).toBeTruthy();
        expect(getByText('Sign Up')).toBeTruthy();
    });

    it('logs in successfully and navigates to main screen', async () => {
        const mockResponse = {
            data: { access_token: 'mock-token' },
            status: 200,
        };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);
        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText('Email'), 'gabrielcupcott@gmail.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'Password1!');
        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                `${API_URLS.LOGIN}`,
                {
                    username: 'gabrielcupcott@gmail.com',
                    password: 'Password1!',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'mock-token');
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userName', 'gabrielcupcott@gmail.com');
            expect(router.push).toHaveBeenCalledWith('/(tabs)');
        });
    });

    it('redirects to the correct route on successful login', async () => {
        const mockResponse = {
            data: {
                token: 'fake-token',
            },
        };
        (axios.post as jest.Mock).mockResolvedValue(mockResponse);
        const { getByText, getByPlaceholderText } = renderWithProviders(
            <Login />
        );
        fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(router.push).toHaveBeenCalledWith('/(tabs)');
        });
    });

    it('fails to log in with wrong credentials', async () => {
        const mockError = {
            response: {
                data: {
                    messages: ['An unexpected error occurred. Check your login information.'],
                },
            },
        };
        (axios.post as jest.Mock).mockRejectedValue(mockError);
        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText('Email'), 'nonexistent@example.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                `${API_URLS.LOGIN}`,
                {
                    username: 'nonexistent@example.com',
                    password: 'wrongpassword',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            expect(getByText('An unexpected error occurred. Check your login information.')).toBeTruthy();
        });
    });

    it('fails to log in with database offline', async () => {
        const mockError = {
            message: 'Network Error',
        };
        (axios.post as jest.Mock).mockRejectedValue(mockError);
        const { getByText, getByPlaceholderText } = renderWithProviders(<Login />);
        fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
        fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                `${API_URLS.LOGIN}`,
                {
                    username: 'test@example.com',
                    password: 'password123',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );
            expect(getByText('An unexpected error occurred. Check your login information.')).toBeTruthy();
        });
    });
});