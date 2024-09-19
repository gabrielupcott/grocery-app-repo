import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import axios from 'axios';
import Register from '../app/Register';
import { API_URLS } from '../constants/constants';
import { ApplicationProvider } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';
import * as SecureStore from 'expo-secure-store';

jest.mock('axios');
jest.mock('expo-secure-store');
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
    },
}));

describe('Register', () => {
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <ApplicationProvider {...eva} theme={eva.light}>
                {ui}
            </ApplicationProvider>
        );
    };

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = renderWithProviders(<Register />);
        expect(getByPlaceholderText('Name')).toBeTruthy();
        expect(getByPlaceholderText('Location')).toBeTruthy();
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
        expect(getByPlaceholderText('Confirm Password')).toBeTruthy();
    });

    it('submits the form and registers successfully', async () => {
        const mockResponse = {
            status: 200,
            data: { message: 'User registered successfully' },
        };

        (axios.post as jest.Mock).mockResolvedValue(mockResponse);

        const { getByPlaceholderText, getByTestId } = renderWithProviders(<Register />);

        // Fill out the registration form
        await act(async () => {
            fireEvent.changeText(getByPlaceholderText('Name'), 'John Doe');
            fireEvent.changeText(getByPlaceholderText('Location'), 'New York');
            fireEvent.changeText(getByPlaceholderText('Email'), 'johndoe@example.com');
            fireEvent.changeText(getByPlaceholderText('Password'), 'Password1!');
            fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'Password1!');
        });

        // Press the Register button
        await act(async () => {
            fireEvent.press(getByTestId('register-button'));
        });

        // Check if the correct API call was made
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
        });

        // Check if SecureStore was called to save the user's data
        await waitFor(() => {
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userName', 'John Doe');
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userLocation', 'New York');
            expect(SecureStore.setItemAsync).toHaveBeenCalledWith('userEmail', 'johndoe@example.com');
        });

        // Check if navigation to "/Verify" was triggered
        await waitFor(() => {
            expect(require('expo-router').router.push).toHaveBeenCalledWith('/Verify');
        });
    });

    it('fails registration with missing/incomplete credentials', async () => {
        const { getByPlaceholderText, getByTestId, getByText } = renderWithProviders(<Register />);
      
        // Fill out the registration form with incomplete data (missing email, mismatched password)
        await act(async () => {
          fireEvent.changeText(getByPlaceholderText('Name'), 'John Doe');
          fireEvent.changeText(getByPlaceholderText('Location'), 'New York');
          fireEvent.changeText(getByPlaceholderText('Password'), 'Password1!');
          fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'Password2!'); // Mismatched confirm password
        });
      
        // Check form errors and validity before submission
        console.log("Form values are incomplete, checking form validity...");
      
        // Press the Register button
        await act(async () => {
          fireEvent.press(getByTestId('register-button'));
        });
      
        // Ensure the API call was not made because of validation failure
        await waitFor(() => {
          expect(axios.post).not.toHaveBeenCalled();
        });
      
        // Ensure navigation did NOT occur to "/Verify"
        await act(async () => {
          expect(require('expo-router').router.push).not.toHaveBeenCalledWith('/Verify');
        });
      });
    
});
