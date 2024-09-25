import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AddItemModal from '../pantry/AddItemModal';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

describe('AddItemModal', () => {
    const mockOnClose = jest.fn();
    const mockOnAdd = jest.fn();
    const mockToken = 'mockToken';
    const mockUserId = 'mockUserId';

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    const setup = (visible: boolean) => {
        return renderWithProviders(
            <AddItemModal
                visible={visible}
                onClose={mockOnClose}
                onAdd={mockOnAdd}
                token={mockToken}
                userId={mockUserId}
            />
        );
    };

    it('renders correctly when visible', () => {
        const { getByText } = setup(true);
        expect(getByText('Add New Item')).toBeTruthy();
    });

    it('does not render when not visible', () => {
        const { queryByText } = setup(false);
        expect(queryByText('Add New Item')).toBeNull();
    });

    it('calls onClose when Cancel button is pressed', () => {
        const { getByText } = setup(true);
        fireEvent.press(getByText('Cancel'));
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not call onAdd when the form is incomplete', async () => {
        const { getByText, getByPlaceholderText } = setup(true);

        // Leave title empty, fill in only the description and price
        fireEvent.changeText(getByPlaceholderText('Description'), 'Test Description');
        fireEvent.changeText(getByPlaceholderText('Price'), '10');

        fireEvent.press(getByText('Add Item'));

        await waitFor(() => {
            // Check that mockOnAdd has NOT been called
            expect(mockOnAdd).not.toHaveBeenCalled();
        });
    });

    it('calls onAdd and onClose when Add Item button is pressed', async () => {
        const { getByText, getByPlaceholderText } = setup(true);

        fireEvent.changeText(getByPlaceholderText('Title'), 'Test Item');
        fireEvent.changeText(getByPlaceholderText('Description'), 'Test Description');
        fireEvent.changeText(getByPlaceholderText('Price'), '10');

        fireEvent.press(getByText('Add Item'));

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('increases and decreases quantity correctly', () => {
        const { getByText, getByDisplayValue, getByTestId } = setup(true);

        const increaseButton = getByTestId('add-button');
        const decreaseButton = getByTestId('decrease-button');

        fireEvent.press(increaseButton);
        expect(getByDisplayValue('2')).toBeTruthy();

        fireEvent.press(decreaseButton);
        expect(getByDisplayValue('1')).toBeTruthy();
    });

    it('adds new nutrient correctly', () => {
        const { getByText, getByPlaceholderText, getByDisplayValue } = setup(true);

        fireEvent.changeText(getByPlaceholderText('Nutrient Name'), 'Protein');
        fireEvent.changeText(getByPlaceholderText('Nutrient Value'), '10g');
        fireEvent.press(getByText('Add New Nutrient'));

        expect(getByText('Protein')).toBeTruthy();
        expect(getByDisplayValue('10g')).toBeTruthy();
    });
});