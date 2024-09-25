import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ItemDetailsModal from '../pantry/ItemDetailsModal';
import { Item } from '../pantry/PantryItem';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';

const mockItem: Item = {
    item_id: '1',
    item_name: 'Test Item',
    item_description: 'Test Description',
    item_price: 10.0,
    item_stock: 5,
    item_image: '',
    item_nutrition: '{"Calories": 100, "Fat": 10}',
    user_id: 'user1',
    item_type: 'type1',
};

const mockOnEdit = jest.fn();
const mockOnSave = jest.fn();
const mockOnClose = jest.fn();

describe('ItemDetailsModal', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it('should call onEdit with updated item when quantity is increased', async () => {
        const { getByText, getByTestId } = renderWithProviders(
            <ItemDetailsModal
                visible={true}
                item={mockItem}
                onClose={mockOnClose}
                onEdit={mockOnEdit}
                token="test-token"
            />
        );

        const increaseButton = getByTestId('add-button');
        fireEvent.press(increaseButton);

        await waitFor(() => {
            expect(mockOnEdit).toHaveBeenCalledWith({
                ...mockItem,
                item_stock: mockItem.item_stock + 1,
            });
        });
    });

    it('should call onEdit with updated item when quantity is decreased', async () => {
        const { getByText, getByTestId } = renderWithProviders(
            <ItemDetailsModal
                visible={true}
                item={mockItem}
                onClose={mockOnClose}
                onEdit={mockOnEdit}
                token="test-token"
            />
        );

        const decreaseButton = getByTestId('decrease-button');
        fireEvent.press(decreaseButton);

        await waitFor(() => {
            expect(mockOnEdit).toHaveBeenCalledWith({
                ...mockItem,
                item_stock: mockItem.item_stock - 1,
            });
        });
    });

    it('should call onEdit with updated item when item details are saved', async () => {
        const { getByText, getByPlaceholderText, getByTestId } = renderWithProviders(
            <ItemDetailsModal
                visible={true}
                item={mockItem}
                onClose={mockOnClose}
                onEdit={mockOnEdit}
                token="test-token"
            />
        );

        const editButton = getByTestId('edit-button');
        fireEvent.press(editButton);

        const titleInput = getByPlaceholderText('Title');
        fireEvent.changeText(titleInput, 'Updated Title');

        const saveButton = getByTestId('confirm-button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            expect(mockOnEdit).toHaveBeenCalled();
        });
    });

    it('should not call onEdit when Title or Description is missing', async () => {
        const { getByTestId, getByPlaceholderText } = renderWithProviders(
            <ItemDetailsModal
                visible={true}
                item={mockItem}
                onClose={mockOnClose}
                onEdit={mockOnEdit}
                token="test-token"
            />
        );

        const editButton = getByTestId('edit-button');
        fireEvent.press(editButton);

        // Clear the title to simulate missing input
        const titleInput = getByTestId('@title-field/input');
        fireEvent.changeText(titleInput, '');

        await waitFor(() => {
            fireEvent.changeText(titleInput, '');
        }   );

        const descriptionInput = getByPlaceholderText('Description');
        fireEvent.changeText(descriptionInput, 'Updated Description'); // Set description

        const saveButton = getByTestId('confirm-button');
        fireEvent.press(saveButton);

        await waitFor(() => {
            // Ensure onEdit is not called because the title is missing
            expect(mockOnEdit).not.toHaveBeenCalledWith({
                ...mockItem,
                item_name: '',
                item_description: 'Updated Description',
            });
        });
    });
});