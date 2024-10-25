import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ListDetailsModal, { ListItem } from '../../lists/ListDetailsModal';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';
import { API_URLS } from '@/constants/constants';

jest.mock('axios');
jest.mock('expo-secure-store');

const mockItems: ListItem[] = [
    {
        item_id: '1',
        item_name: 'Apple',
        item_description: 'Fresh Apple',
        item_nutrition: 'Vitamin C',
        item_price: 1.5,
        item_stock: 10,
        item_type: 'Fruit',
        item_image: 'apple.png',
        user_id: 'user1',
        amount: 2,
    },
    {
        item_id: '2',
        item_name: 'Banana',
        item_description: 'Fresh Banana',
        item_nutrition: 'Potassium',
        item_price: 1.0,
        item_stock: 20,
        item_type: 'Fruit',
        item_image: 'banana.png',
        user_id: 'user1',
        amount: 3,
    },
];

describe('ListDetailsModal', () => {

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    const mockProps = {
        visible: true,
        listId: '123',
        name: 'My List',
        onClose: jest.fn(),
        token: 'mock-token',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        axios.put = jest.fn(); // Explicitly mock axios.put
        expect(axios.put).toBeDefined(); // Check axios.put is defined
    });

    it('renders correctly when visible', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user1');
        (axios.get as jest.Mock).mockResolvedValue({ data: { items: mockItems } });

        const { getByText } = renderWithProviders(<ListDetailsModal {...mockProps} />);

        await waitFor(() => {
            expect(getByText('"My List"')).toBeTruthy();
            expect(getByText('Apple')).toBeTruthy();
            expect(getByText('Banana')).toBeTruthy();
        });
    });

    it('handles item press and opens item details modal', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user1');
        (axios.get as jest.Mock).mockResolvedValue({ data: { items: mockItems } });

        const { getByText, getByPlaceholderText } = renderWithProviders(<ListDetailsModal {...mockProps} />);

        await waitFor(() => {
            expect(getByText('Apple')).toBeTruthy();
        });

        fireEvent.press(getByText('Apple'));

        await waitFor(() => {
            expect(getByPlaceholderText('Search items in list...')).toBeTruthy();
        });
    });

    it('handles search query change', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user1');
        (axios.get as jest.Mock).mockResolvedValue({ data: { items: mockItems } });

        const { getByPlaceholderText, getByText } = renderWithProviders(<ListDetailsModal {...mockProps} />);

        await waitFor(() => {
            expect(getByText('Apple')).toBeTruthy();
        });

        const searchInput = getByPlaceholderText('Search items in list...');
        fireEvent.changeText(searchInput, 'Banana');

        await waitFor(() => {
            expect(getByText('Banana')).toBeTruthy();
            expect(() => getByText('Apple')).toThrow();
        });
    });

    it('handles save list', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user1');
        (axios.get as jest.Mock).mockResolvedValue({ data: { items: mockItems } });
        (axios.put as jest.Mock).mockResolvedValue({}); // Ensure axios.put is correctly mocked
    
        const { getByText, getByTestId } = renderWithProviders(<ListDetailsModal {...mockProps} />);
    
        await waitFor(() => {
            expect(getByText("\"My List\"")).toBeTruthy();
        });
    
        fireEvent.press(getByTestId('edit-button'));
    
        await waitFor(() => {
            expect(getByText('Save List')).toBeTruthy();
        });
    
        fireEvent.press(getByTestId('save-shop-button'));
    
        await waitFor(() => {
            // Confirm that axios.put was called
            expect(axios.put).toHaveBeenCalledWith(
                `${API_URLS.UPDATE_LIST_BY_ID}/123`,
                expect.any(Object),
                expect.any(Object)
            );
        });
    
        await waitFor(() => {
            // Confirm that onClose is called after axios.put completes
            expect(mockProps.onClose).toHaveBeenCalled();
        });
    });
    

    it('handles cancel edit', async () => {
        (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user1');
        (axios.put as jest.Mock).mockResolvedValue({});

        const { getByText, getByTestId } = renderWithProviders(<ListDetailsModal {...mockProps} />);

        await waitFor(() => {
            expect(getByText('"My List"')).toBeTruthy();
        });

        fireEvent.press(getByTestId('edit-button'));

        await waitFor(() => {
            expect(getByText('Cancel')).toBeTruthy();
        });

        fireEvent.press(getByText('Cancel'));

        await waitFor(() => {
            expect(getByText('"My List"')).toBeTruthy();
        });
    });
});