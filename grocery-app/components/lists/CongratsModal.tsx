import React from 'react';
import { View, StyleSheet, FlatList, Modal, ScrollView, Image } from 'react-native';
import { Text, Button } from '@ui-kitten/components';
import { ListItem } from './ListDetailsModal'; // Assuming ListItem type is defined here

type CongratsModalProps = {
  visible: boolean;
  purchasedItems: ListItem[];
  totalCost: number;
  onClose: () => void;
  allDone: boolean;
};

const CongratsModal: React.FC<CongratsModalProps> = ({ visible, purchasedItems, totalCost, onClose, allDone }) => {
  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Text category="h4" style={styles.headerText}>
          Congrats!
        </Text>
        <Text category="s1" style={styles.subHeaderText}>
          You finished{allDone ? "" : " (most of)"} your shopping!
        </Text>

        <Text category="p1" style={styles.breakdownHeader}>Items Purchased:</Text>

        <View style={styles.content}>
          {/* Scrollable FlatList */}
          {purchasedItems.length > 0 ? (
            <FlatList
              data={purchasedItems}
              keyExtractor={(item) => item.item_id}
              style={styles.flatList}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.item_image }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.item_name} (x{item.amount})</Text>
                    <Text style={styles.itemPrice}>${item.item_price.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noItemsText}>No items purchased.</Text>
          )}
        </View>

        {/* Bottom Section with Total Cost and Close Button */}
        <View style={styles.bottomSection}>
          <Text category="h6" style={styles.totalCost}>
            Total Cost: ${totalCost.toFixed(2)}
          </Text>

          <Button style={styles.closeButton} onPress={onClose}>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    marginBottom: 10,
  },
  subHeaderText: {
    fontSize: 18,
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
  },
  breakdownHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'black',
  },
  content: {
    flex: 1,  // This allows the FlatList to take available space
    width: '100%',
  },
  flatList: {
    flexGrow: 0,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#888',
  },
  noItemsText: {
    fontSize: 16,
    color: 'black',
    marginTop: 10,
  },
  bottomSection: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  totalCost: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#3366FF',
    borderRadius: 10,
  },
});

export default CongratsModal;
