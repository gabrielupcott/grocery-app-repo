import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Lists from '../app/(tabs)/Lists';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URLS } from '@/constants/constants';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
jest.mock('axios');
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
}));

describe('Lists Component', () => {
    const mockNavigation = { navigate: jest.fn() };
    const mockRoute = {};

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

    it('renders correctly', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: {
                lists: [
                    { list_id: '1', list_name: 'Groceries', first_item_image: null, item_count: 5 },
                    { list_id: '2', list_name: 'To Do', first_item_image: null, item_count: 3 },
                ],
            },
        });

        const { getByText, getByPlaceholderText } = renderWithProviders(<Lists navigation={mockNavigation} route={mockRoute} />);

        await waitFor(() => {
            expect(getByText('Your Lists')).toBeTruthy();
            expect(getByPlaceholderText('Search lists...')).toBeTruthy();
            expect(getByText('Groceries')).toBeTruthy();
            expect(getByText('To Do')).toBeTruthy();
        });
    });

    it('fetches and displays lists', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: {
                lists: [
                    { list_id: '1', list_name: 'Groceries', first_item_image: null, item_count: 5 },
                    { list_id: '2', list_name: 'To Do', first_item_image: null, item_count: 3 },
                ],
            },
        });

        const { getByText } = render(<Lists navigation={mockNavigation} route={mockRoute} />);

        await waitFor(() => {
            expect(getByText('Groceries')).toBeTruthy();
            expect(getByText('To Do')).toBeTruthy();
        });
    });

    it('filters lists based on search query', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: {
                lists: [
                    { list_id: '1', list_name: 'Groceries', first_item_image: null, item_count: 5 },
                    { list_id: '2', list_name: 'To Do', first_item_image: null, item_count: 3 },
                ],
            },
        });

        const { getByPlaceholderText, getByText, queryByText } = renderWithProviders(<Lists navigation={mockNavigation} route={mockRoute} />);

        await waitFor(() => {
            expect(getByText('Groceries')).toBeTruthy();
            expect(getByText('To Do')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Search lists...');
        fireEvent.changeText(searchInput, 'Groceries');

        await waitFor(() => {
            expect(getByText('Groceries')).toBeTruthy();
            expect(queryByText('To Do')).toBeNull();
        });
    });

    it('opens and closes the add list modal', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserName');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testToken');
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('testUserId');

        (axios.get as jest.Mock).mockResolvedValueOnce({
            data: {
                lists: [
                    { list_id: '1', list_name: 'Groceries', first_item_image: null, item_count: 5 },
                    { list_id: '2', list_name: 'To Do', first_item_image: null, item_count: 3 },
                ],
            },
        });

        const { getByText, queryByText } = renderWithProviders(<Lists navigation={mockNavigation} route={mockRoute} />);

        await waitFor(() => {
            expect(getByText('Groceries')).toBeTruthy();
            expect(getByText('To Do')).toBeTruthy();
        });

        const addButton = getByText('Add New List');
        fireEvent.press(addButton);

        await waitFor(() => {
            expect(queryByText('Add List Modal')).toBeTruthy();
        });

        const closeButton = getByText('Close');
        fireEvent.press(closeButton);

        await waitFor(() => {
            expect(queryByText('Add List Modal')).toBeNull();
        });
    });
});