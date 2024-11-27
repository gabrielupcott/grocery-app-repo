// constants.ts
const BASE_URL = "http://10.0.2.2:8000";

// base url for web
// const BASE_URL = "http://127.0.0.1:8000";

export const API_URLS = {
  API_TEST: `${BASE_URL}/`,
  LOGIN: `${BASE_URL}/app-login`,
  REGISTER: `${BASE_URL}/register`,
  CONFIRM_REGISTRATION: `${BASE_URL}/confirm-registration`,
  RESEND_CONFIRMATION_CODE: "https://your-api-url/resend-confirmation-code",
  GET_ITEMS_BY_USER: `${BASE_URL}/items/user`,
  GET_USERID_BY_EMAIL: `${BASE_URL}/user-id`,
  GET_LISTS_BY_USER: `${BASE_URL}/lists/user`,
  GET_LIST_BY_ID: `${BASE_URL}/lists`,
  DELETE_LIST_BY_ID: `${BASE_URL}/lists`,
  UPDATE_LIST_BY_ID: `${BASE_URL}/lists`,
  ADD_LIST: `${BASE_URL}/lists`,
  ADD_ITEM: `${BASE_URL}/items`,
  PRODUCT_INFO: `${BASE_URL}/product-info`,
  GET_USER_TYPE: `${BASE_URL}/user-type`,
  GET_USER_LOCATION: `${BASE_URL}/user-location`,
  VERIFY_LOCATION: `${BASE_URL}/verify-location`,
  NEARBY_STORES: `${BASE_URL}/nearby-stores`,
  GET_USER_LOCATION_COORDINATES: `${BASE_URL}/user-location-coordinates`,
  GET_STORES_BY_OWNER: `${BASE_URL}/stores/owner`,
  CREATE_STORE: `${BASE_URL}/stores`,
  UPDATE_STORE: `${BASE_URL}/stores`,
  DELETE_STORE: `${BASE_URL}/stores`,

  // Add other endpoints as needed
};
