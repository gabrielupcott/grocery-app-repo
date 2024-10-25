import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddListModal from '../lists/AddListModal';
import axios from 'axios';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

jest.mock('axios');

const mockProps = {
    visible: true,
    onClose: jest.fn(),
    token: 'mock-token',
    userId: 'mock-user-id',
};

describe('AddListModal', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };
    
    it('renders correctly when visible', () => {
        const { getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        expect(getByText('Add Items to new List')).toBeTruthy();
    });

    it('does not render when not visible', () => {
        const { queryByText } = renderWithProviders(<AddListModal {...mockProps} visible={false} />);
        expect(queryByText('Add Items to new List')).toBeNull();
    });

    it('fetches user data on mount', async () => {
        const mockItems = [{ item_id: '1', item_name: 'Item 1', item_stock: 10 }];
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: mockItems } });

        const { getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        await waitFor(() => expect(getByText('Item 1')).toBeTruthy());
    });

    it('handles search input correctly', async () => {
        const mockItems = [{ item_id: '1', item_name: 'Item 1', item_stock: 10 }];
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: mockItems } });

        const { getByPlaceholderText, getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        await waitFor(() => expect(getByText('Item 1')).toBeTruthy());

        const searchInput = getByPlaceholderText('Search items in pantry...');
        fireEvent.changeText(searchInput, 'Item 1');
        expect(searchInput.props.value).toBe('Item 1');
    });

    it('adds item to the list', async () => {
        const mockItems = [{ item_id: '1', item_name: 'Item 1', item_stock: 10 }];
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: mockItems } });

        const { getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        await waitFor(() => expect(getByText('Item 1')).toBeTruthy());

        const addButton = getByText('Add');
        fireEvent.press(addButton);
        expect(getByText('Save List')).toEqual(expect.objectContaining({ disabled: false }));
    });

    it('removes item from the list', async () => {
        const mockItems = [{ item_id: '1', item_name: 'Item 1', item_stock: 10 }];
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: mockItems } });

        const { getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        await waitFor(() => expect(getByText('Item 1')).toBeTruthy());

        const addButton = getByText('Add');
        fireEvent.press(addButton);
        expect(getByText('Save List')).toEqual(expect.objectContaining({ disabled: false }));

        const deleteButton = getByText('Delete');
        fireEvent.press(deleteButton);
        expect(getByText('Save List')).toEqual(expect.objectContaining({ disabled: false }));
    });

    it('saves the list', async () => {
        const mockItems = [{ item_id: '1', item_name: 'Item 1', item_stock: 10 }];
        (axios.get as jest.Mock).mockResolvedValueOnce({ data: { items: mockItems } });
        (axios.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

        const { getByText } = renderWithProviders(<AddListModal {...mockProps} />);
        await waitFor(() => expect(getByText('Item 1')).toBeTruthy());

        const addButton = getByText('Add');
        fireEvent.press(addButton);
        expect(getByText('Save List')).toEqual(expect.objectContaining({ disabled: false }));

        const saveButton = getByText('Save List');
        fireEvent.press(saveButton);
        await waitFor(() => expect(mockProps.onClose).toHaveBeenCalled());
    });
});