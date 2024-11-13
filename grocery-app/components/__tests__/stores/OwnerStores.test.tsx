import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import OwnerStores from '@/components/stores/OwnerStores';
import { ApplicationProvider } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';
import FloatingAction from "react-native-floating-action"; // Import for type usage

jest.mock('axios');

const mockStores = [
    {
        store_id: '1',
        store_name: 'Store 1',
        store_location: 'Location 1',
        store_flyer_link: 'http://example.com/flyer1',
        owner_id: 'owner_id',
        latitude: 33.5186,
        longitude: -86.8104,
    },
    {
        store_id: '2',
        store_name: 'Store 2',
        store_location: 'Location 2',
        owner_id: 'owner_id',
        store_flyer_link: 'http://example.com/flyer2',
        latitude: 34.5186,
        longitude: -87.8104,
    },
];

describe('OwnerStores Component', () => {
    const userId = 'test@example.com';
    const token = 'test-token';

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        axios.delete = jest.fn();
    });

    it('renders loading indicator initially', () => {
        const { getByText } = renderWithProviders(<OwnerStores userId={userId} token={token} />);
        expect(getByText('Loading your stores...')).toBeTruthy();
    });

    it('fetches and displays stores', async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_id: 'owner-id' } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { stores: mockStores } });

        const { getByText } = renderWithProviders(<OwnerStores userId={userId} token={token} />);

        await waitFor(() => expect(getByText('Store 1')).toBeTruthy());
        expect(getByText('Store 2')).toBeTruthy();
    });

    it('opens and closes Add New Store modal', async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_id: 'owner-id' } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { stores: mockStores } });

        const { getByText, getByPlaceholderText, queryByText, getByTestId } = renderWithProviders(<OwnerStores userId={userId} token={token} />);

        await waitFor(() => expect(getByText('Store 1')).toBeTruthy());

        fireEvent.press(getByTestId("add-store-button"));

        fireEvent.changeText(getByPlaceholderText('Store Name'), 'New Store');
        fireEvent.changeText(getByPlaceholderText('Store Location'), 'New Location');
        fireEvent.changeText(getByPlaceholderText('Flyer Link'), 'http://example.com/newflyer');

        fireEvent.press(getByText('Cancel'));
        expect(queryByText('Add New Store')).toBeNull();
    });

    it('handles store creation', async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_id: 'owner-id' } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { stores: mockStores } });

        // Mock the location verification request
        (axios.post as jest.Mock).mockResolvedValueOnce({ data: { found: true } });

        // Mock the store creation request
        (axios.post as jest.Mock).mockResolvedValueOnce({});

        const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
            <OwnerStores userId={userId} token={token} />
        );

        await waitFor(() => expect(getByText('Store 1')).toBeTruthy());

        fireEvent.press(getByTestId("add-store-button"));

        fireEvent.changeText(getByPlaceholderText('Store Name'), 'New Store');
        fireEvent.changeText(getByPlaceholderText('Store Location'), 'New Location');
        fireEvent.changeText(getByPlaceholderText('Flyer Link'), 'http://example.com/newflyer');

        fireEvent.press(getByText('Create Store'));

        // Check that location verification was called first
        await waitFor(() =>
            expect(axios.post).toHaveBeenCalledTimes(1)
        );
    });

    it('handles store deletion', async () => {
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { user_id: 'owner-id' } });
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { stores: mockStores } });
        (axios.delete as jest.Mock).mockResolvedValueOnce({});

        const { getByText, getAllByText, getAllByTestId } = renderWithProviders(<OwnerStores userId={userId} token={token} />);

        await waitFor(() => expect(getByText('Store 1')).toBeTruthy());

        fireEvent.press(getAllByTestId("edit-button")[0]);
        fireEvent.press(getByText('Delete Store'));

        fireEvent.press(getByText('Delete'));

        await waitFor(() => expect(axios.delete).toHaveBeenCalledWith(expect.any(String), expect.any(Object)));
    });
});