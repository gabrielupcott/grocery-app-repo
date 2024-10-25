import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Button, Input } from '@ui-kitten/components';

type SaveListModalProps = {
    visible: boolean;
    onSave: (listName: string) => void;
    onChangeName: (listName: string) => void;
    onCancel: () => void;
};

const SaveListModal: React.FC<SaveListModalProps> = ({ visible, onSave, onCancel, onChangeName }) => {
    const [listName, setListName] = useState<string>('');

    const handleNameChange = (name: string) => {
        setListName(name);
        onChangeName(name);
    };

    const handleSave = () => {
        onSave(listName);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel} // This will close the modal when back button is pressed on Android
        >
            <View style={styles.modalOverlay} testID='modal'>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Save List</Text>
                    <Input
                        style={styles.input}
                        placeholder="Enter list name"
                        testID='list-name-input'
                        value={listName}
                        onChangeText={handleNameChange}
                    />
                    <View style={styles.actionButtons}>
                        <Button style={styles.cancelButton} appearance="outline" onPress={onCancel}>
                            Cancel
                        </Button>
                        <Button style={styles.saveButton} onPress={handleSave}>
                            Save
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default SaveListModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darkens the background to indicate a modal
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
        borderWidth: 1,
    },
    title: {
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 10,
    },
    input: {
        marginBottom: 20,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    cancelButton: {
        marginRight: 10,
    },
    saveButton: {
        marginLeft: 10,
    },
});
