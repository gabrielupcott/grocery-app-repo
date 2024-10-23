import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Input } from "@ui-kitten/components";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import { FloatingAction } from "react-native-floating-action";
import { API_URLS } from "@/constants/constants"; // Assuming you have this file
import ListDetailsModal from '../../components/lists/ListDetailsModal'; // Import the ListDetailsModal

type List = {
  list_id: string;
  list_name: string;
  list_image?: string | null;
  item_count: number; // You'll need to calculate this from list_item_lines in the backend
};

const actions = [
  {
    text: "Add New List",
    icon: require("../../assets/images/add_icon.png"), // Replace with your plus icon
    name: "add_list",
    position: 1,
    color: '#000000', // Background color of the action button
    textColor: '#000000', // Text color for the label
  }
];

const Lists: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const layout = useWindowDimensions();
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string | null>(null);
  const [listModalVisible, setListModalVisible] = useState<boolean>(false);
  // Dict of list_id to item count
  const [listItemCounts, setListItemCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const loadUserData = async () => {
      const storedUserName = await SecureStore.getItemAsync("userName");
      const storedToken = await SecureStore.getItemAsync("token");
      const storedUserId = await SecureStore.getItemAsync("user_id");

      setUserName(storedUserName);
      setToken(storedToken);
      setUserId(storedUserId);

      if (storedToken && storedUserId) {
        fetchLists(storedUserId, storedToken);
      }
    };

    loadUserData();
  }, []);

  // Need function to get amount of items in list
  const getListItemCount = async(listId: string) => {
    try{
      setLoading(true);
      const response = await axios.get(`${API_URLS.GET_LIST_BY_ID}/${listId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.items.length;
    } catch (error) {
      console.error('Error fetching list items:', error);
    }
  };

  const fetchLists = async (userId: string, token: string) => {
    console.log(userId);
    try {
      const response = await axios.get(`${API_URLS.GET_LISTS_BY_USER}/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLists(response.data.lists);
      setLoading(false);
      // Iterate through lists to populate dict of list_id to item count
      const itemCounts: { [key: string]: number } = {};
      for (let list of response.data.lists) {
        itemCounts[list.list_id] = await getListItemCount(list.list_id);
      }
      setListItemCounts(itemCounts);

    } catch (error) {
      console.error("Error fetching lists:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId && token) {
      await fetchLists(userId, token);
    }
    setRefreshing(false);
  };

  const filterLists = () => {
    return lists.filter(list => list.list_name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const openListDetailsModal = (listId: string) => {
    setSelectedListId(listId);
    setSelectedListName(lists.find(list => list.list_id === listId)?.list_name || null);
    setListModalVisible(true);
  };

  const renderListItem = ({ item }: { item: List }) => (
    <TouchableOpacity onPress={() => openListDetailsModal(item.list_id)}>
      <View style={styles.listItemContainer}>
        {item.list_image ? (
          <Icon name="image" size={40} /> // Placeholder for actual image
        ) : (
          <Icon name="image-outline" size={40} />
        )}
        <View style={styles.listTextContainer}>
          {/* Wrapping text in Text component */}
          <Text category="s1">{item.list_name}</Text>
          <Text appearance="hint">{listItemCounts[item.list_id]} items</Text>
        </View>
        <Icon name="ellipsis-vertical" size={24} />
      </View>
    </TouchableOpacity>
  );

  const handleAddList = () => {
    navigation.navigate("AddList"); // Navigate to Add List screen
  };

  return (
    <Layout style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text category="h4" style={styles.headerText}>
            Your Lists
          </Text>
        </View>

        {/* Search Bar */}
        <Input
          placeholder="Search lists..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessoryLeft={(props) => <Icon {...props} name="search-outline" />}
          style={styles.searchBar}
        />

        {/* List of User's Lists */}
        <FlatList
          data={filterLists()}
          keyExtractor={(item) => item.list_id}
          renderItem={renderListItem}
          ListEmptyComponent={
            <Text style={styles.noListsText}>
              {loading ? "Loading..." : "No lists found. Try adding one!"}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />

        {/* Floating Action Button */}
        <FloatingAction
          actions={actions}
          color="#000000"
          onPressItem={name => {
            if (name === "add_list") {
              handleAddList();
            }
          }}
        />

        {/* List Details Modal */}
        <ListDetailsModal
          visible={listModalVisible}
          listId={selectedListId}
          name={selectedListName}
          onClose={() => setListModalVisible(false)}
          token={token}
        />
      </SafeAreaView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center', // Centers the "Your Pantry" text
    justifyContent: 'center',
  },
  headerText: {
    textAlign: "center",
    marginBottom: 20,
  },
  searchBar: {
    marginBottom: 20,
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
  },
  listTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  noListsText: {
    textAlign: "center",
    marginTop: 20,
  },
});

export default Lists;
