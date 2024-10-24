import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import React, { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Layout, Text, Input, OverflowMenu, MenuItem, Button } from "@ui-kitten/components";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons'; // For the filter icon
import { FloatingAction } from "react-native-floating-action";
import { API_URLS } from "@/constants/constants";
import ListDetailsModal from '../../components/lists/ListDetailsModal';
import List from "@/components/lists/List"; // The List component we defined earlier
import DeleteConfirmationModal from '@/components/pantry/DeleteConfirmationModal'; // For delete confirmation
import AddListModal from "@/components/lists/AddListModal";

type ListType = {
  list_id: string;
  list_name: string;
  first_item_image?: string | null; // Image of the first item in the list
  item_count: number;
};

const actions = [
  {
    text: "Add New List",
    icon: require("../../assets/images/add_icon.png"),
    name: "add_list",
    position: 1,
    color: '#000000',
    textColor: '#000000',
  }
];

const Lists: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const layout = useWindowDimensions();
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lists, setLists] = useState<ListType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedList, setSelectedList] = useState<ListType | null>(null);
  const [listModalVisible, setListModalVisible] = useState<boolean>(false);
  const [listItemCounts, setListItemCounts] = useState<{ [key: string]: number }>({});
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<string>(''); // No default sort option initially
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addListModalVisible, setAddListModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const storedUserName = await SecureStore.getItemAsync("userName");
    const storedToken = await SecureStore.getItemAsync("token");
    const storedUserId = await SecureStore.getItemAsync("user_id");

    setUserName(storedUserName);
    setToken(storedToken);
    setUserId(storedUserId);

    console.log("Stored user data:", storedUserId);

    if (storedToken && storedUserId) {
      fetchLists(storedUserId, storedToken);
    }
    setLoading(false);
  };

  const getListItemCount = async (listId: string, token: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URLS.GET_LIST_BY_ID}/${listId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // console.log("List items:", response.data.items.length);
      return response.data.items.length;
    } catch (error) {
      console.error('Error fetching list items:', error);
    }
  };

  const fetchLists = async (userId: string, token: string) => {
    try {
      const response = await axios.get(`${API_URLS.GET_LISTS_BY_USER}/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // console.log(response.data);
      if (!response.data.lists) {
        setLists([]);
        return;
      }
      // Iterate through the lists and fetch the item count for each list
      const listsWithItemCount = await Promise.all(
        response.data.lists.map(async (list: ListType) => {
          const itemCount = await getListItemCount(list.list_id, token);
          return {
            ...list,
            first_item_image: list.first_item_image || null, // Assuming the API provides this field
            item_count: itemCount || 0, // Ensure item_count is set, default to 0 if undefined
          };
        })
      );

      setLists(listsWithItemCount);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching lists:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (userId && token) {
      loadUserData();
    }
    setRefreshing(false);
  };

  const sortLists = (lists: ListType[]) => {
    if (sortOption === 'asc') {
      return lists.sort((a, b) => listItemCounts[a.list_id] - listItemCounts[b.list_id]);
    } else if (sortOption === 'desc') {
      return lists.sort((a, b) => listItemCounts[b.list_id] - listItemCounts[a.list_id]);
    }
    return lists;
  };

  const filterLists = () => {
    const filtered = lists.filter(list => list.list_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return sortLists(filtered);
  };

  const openListDetailsModal = (list: ListType) => {
    setSelectedList(list);
    setListModalVisible(true);
  };

  const handleAddList = () => {
    setAddListModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedList && token) {
      try {
        await axios.delete(`${API_URLS.DELETE_LIST_BY_ID}/${selectedList.list_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setLists(prevLists => prevLists.filter(list => list.list_id !== selectedList.list_id));
        setDeleteModalVisible(false);
        setSelectedList(null);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const handleDelete = (list: ListType) => {
    setSelectedList(list);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setSelectedList(null);
  };

  return (
    <Layout style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <Text category="h4" style={styles.headerText}>
            Your Lists
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessoryLeft={(props) => <Icon size={24} {...props} name="search-outline" />}
            style={styles.searchBar}
          />
        </View>

        <FlatList
          data={filterLists()}
          keyExtractor={(item) => item.list_id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openListDetailsModal(item)}>
              <List list={item} onEdit={() => openListDetailsModal(item)} onDelete={() => handleDelete(item)} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text category="p1" style={styles.noListsText}>{loading ? "Loading..." : "You have no lists, try adding some."}</Text>}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />

        <FloatingAction
          actions={actions}
          color="#000000"
          onPressItem={name => {
            if (name === "add_list") {
              handleAddList();
            }
          }}
        />

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          onClose={closeDeleteModal}
          onDelete={handleDeleteConfirm}
          itemName={selectedList?.list_name || ""}
        />

        <ListDetailsModal
          visible={listModalVisible}
          listId={selectedList?.list_id ?? null}
          name={selectedList?.list_name ?? null}
          onClose={() => setListModalVisible(false)}
          token={token}
        />

        <AddListModal
          visible={addListModalVisible} // AddListModal is not yet implemented
          onClose={() => {
            setAddListModalVisible(false);
            handleRefresh();
          }}
          userId={userId}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    textAlign: "center",
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBar: {
    flex: 1,
    marginBottom: 20,
  },
  noListsText: {
    textAlign: "center",
    marginTop: 20,
  },
});

export default Lists;
