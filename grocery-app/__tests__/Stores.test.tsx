import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Stores from '../app/(tabs)/Stores';
import { API_URLS } from '@/constants/constants';
import OwnerStores from '@/components/stores/OwnerStores';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('@/components/stores/OwnerStores', () => 'OwnerStores');
jest.mock('react-native-maps', () => {
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: { children: React.ReactNode }) => <View>{props.children}</View>,
        Marker: (props: { children: React.ReactNode }) => <View>{props.children}</View>,
    };
});

describe('Stores Component', () => {

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        const { getByText } = renderWithProviders(<Stores navigation={{}} route={{}} />);
        expect(getByText('Looking for stores...')).toBeTruthy();
    });

    it('fetches and displays user data and nearby stores', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUser').mockResolvedValueOnce('testToken');
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_type: 1 } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_location: 'testLocation' } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { latitude: 33.5186, longitude: -86.8104 } });
        // (axios.get as jest.Mock).mockResolvedValueOnce({ data: { latitude: 33.5186, longitude: -86.8104 } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: [{ store_id: '1', store_name: 'Test Store', store_location: 'Test Location' }] });


        const { getByText, getByTestId, getAllByText } = renderWithProviders(<Stores navigation={{}} route={{}} />);

        await waitFor(() => expect(getAllByText('Stores')).toBeTruthy());

        expect(getByText('Test Store')).toBeTruthy();
    });

    it('handles errors gracefully', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUser').mockResolvedValueOnce('testToken');
        (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

        const { getByText } = renderWithProviders(<Stores navigation={{}} route={{}} />);

        await waitFor(() => expect(getByText('Looking for stores...')).toBeTruthy());
    });
});