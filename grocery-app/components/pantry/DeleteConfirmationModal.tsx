import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { Text, Button } from '@ui-kitten/components';

type DeleteConfirmationModalProps = {
    visible: boolean;
    onClose: () => void;
    onDelete: () => void;
    itemName: string;
};

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ visible, onClose, onDelete, itemName }) => {
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Delete "{itemName ? itemName : "item"}"?</Text>
                    <Text style={styles.subtitle}>This can't be undone</Text>
                    <View style={styles.actionButtons}>
                        <Button style={styles.cancelButton} appearance="outline" onPress={onClose}>
                            Cancel
                        </Button>
                        <Button style={styles.deleteButton} onPress={onDelete}>
                            Delete
                        </Button>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: 'rgba(0, 0, 0, 0.5)',
        // add small black border
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
    subtitle: {
        fontSize: 14,
        color: 'gray',
        marginBottom: 20,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        marginRight: 10,
    },
    deleteButton: {
        flex: 1,
        backgroundColor: 'red',
        borderColor: 'red',
    },
});

export default DeleteConfirmationModal;
