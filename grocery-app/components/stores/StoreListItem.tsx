import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Divider } from '@ui-kitten/components';
import Icon from 'react-native-vector-icons/Feather';

type Store = {
    store_id: string;
    store_name: string;
    store_flyer_link: string;
    store_location: string;
};

type StoreListItemProps = {
    store: Store;
    onOpenFlyer: (url: string) => void;
    mode: string;
};

const StoreListItem: React.FC<StoreListItemProps> = ({ store, onOpenFlyer, mode }) => {
    return (
        <View style={styles.container}>
            <View style={styles.details}>
                <Text category="s1" style={styles.storeName}>
                    {store.store_name}
                </Text>
                <Text category="p2" appearance="hint">
                    {store.store_location}
                </Text>
            </View>
            <TouchableOpacity onPress={() => onOpenFlyer(store.store_flyer_link)} testID="edit-button">
                <Icon name={mode === "edit" ? "edit" : "external-link"} size={24} color="#000000" style={styles.icon} />
            </TouchableOpacity>
            <Divider />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    storeName: {
        fontWeight: 'bold',
    },
    icon: {
        marginLeft: 10,
    },
});

export default StoreListItem;
