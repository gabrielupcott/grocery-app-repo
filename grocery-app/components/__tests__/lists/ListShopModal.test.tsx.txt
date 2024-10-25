import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ListShopModal from "../../lists/ListShopModal"
import { ListItem } from '../../lists/ListDetailsModal';
import { ApplicationProvider } from "@ui-kitten/components";
import * as eva from '@eva-design/eva';
import '@testing-library/jest-native/extend-expect';
// Removed incorrect import and expect.extend for toBeDisabled

const mockListItems: ListItem[] = [
    {
        item_id: '1', item_name: 'Milk', item_price: 2.5, isChecked: false,
        item_description: '',
        item_nutrition: '',
        item_stock: 0,
        item_type: '',
        item_image: '',
        user_id: '',
        amount: 1
    },
    {
        item_id: '2', item_name: 'Bread', item_price: 1.5, isChecked: false,
        item_description: '',
        item_nutrition: '',
        item_stock: 0,
        item_type: '',
        item_image: '',
        user_id: '',
        amount: 2
    },
    {
        item_id: '3', item_name: 'Eggs', item_price: 3.0, isChecked: true,
        item_description: '',
        item_nutrition: '',
        item_stock: 0,
        item_type: '',
        item_image: '',
        user_id: '',
        amount: 3
    },
];

describe('ListShopModal', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };
    
    it('renders correctly when visible', () => {
        const { getByText } = renderWithProviders(
            <ListShopModal
                visible={true}
                listItems={mockListItems}
                onClose={jest.fn()}
                onDone={jest.fn()}
            />
        );

        expect(getByText('Shopping List')).toBeTruthy();
    });

    it('does not render when not visible', () => {
        const { queryByText } = renderWithProviders(
            <ListShopModal
                visible={false}
                listItems={mockListItems}
                onClose={jest.fn()}
                onDone={jest.fn()}
            />
        );

        expect(queryByText('Shopping List')).toBeNull();
    });

    it('filters items based on search query', () => {
        const { getByPlaceholderText, getByText } = renderWithProviders(
            <ListShopModal
                visible={true}
                listItems={mockListItems}
                onClose={jest.fn()}
                onDone={jest.fn()}
            />
        );

        const searchInput = getByPlaceholderText('Search items...');
        fireEvent.changeText(searchInput, 'Milk');

        expect(getByText('Milk')).toBeTruthy();
        expect(() => getByText('Bread')).toThrow();
    });

    it('toggles item checked state', () => {
        const { getByText } = renderWithProviders(
            <ListShopModal
                visible={true}
                listItems={mockListItems}
                onClose={jest.fn()}
                onDone={jest.fn()}
            />
        );

        const milkItem = getByText('Milk');
        fireEvent.press(milkItem);

        // Expect not to find the item since it is checked
        expect(() => getByText('Milk')).toThrow();
    });

    it('calls onClose when cancel button is pressed', () => {
        const onCloseMock = jest.fn();
        const { getByText } = renderWithProviders(
            <ListShopModal
                visible={true}
                listItems={mockListItems}
                onClose={onCloseMock}
                onDone={jest.fn()}
            />
        );

        const cancelButton = getByText('Cancel');
        fireEvent.press(cancelButton);

        expect(onCloseMock).toHaveBeenCalled();
    });

    it('shows congrats modal when done button is pressed', async () => {
        const onDoneMock = jest.fn();
        const { getByText, getByTestId } = renderWithProviders(
            <ListShopModal
                visible={true}
                listItems={mockListItems}
                onClose={jest.fn()}
                onDone={onDoneMock}
            />
        );

        const milkItem = getByText('Milk');
        fireEvent.press(milkItem);

        const doneButton = getByText('Done');
        fireEvent.press(doneButton);

        // expect congrads modal to be visible
        await waitFor(() => expect(getByTestId('congrats-modal')).toBeTruthy());

    });

});