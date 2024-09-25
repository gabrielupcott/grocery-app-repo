import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Pantry from '../app/(tabs)/index';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URLS } from '@/constants/constants';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

// Mock the necessary modules
jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('expo-router', () => ({
    router: {
        replace: jest.fn(),
    },
}));

describe('Pantry Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it('renders correctly', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        const { getByText, getByPlaceholderText } = renderWithProviders(<Pantry />);

        await waitFor(() => {
            expect(getByText('Your Pantry')).toBeTruthy();
            expect(getByPlaceholderText('Search items...')).toBeTruthy();
        });
    });

    it('handles logout correctly on back press', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        const { getByText } = renderWithProviders(<Pantry />);

        await waitFor(() => {
            expect(getByText('Your Pantry')).toBeTruthy();
        });

        fireEvent.press(getByText('Log out'));

        await waitFor(() => {
            // Check if the SecureStore.deleteItemAsync is called correctly
            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('user_id');
            expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('userName');
        });
    });
});
