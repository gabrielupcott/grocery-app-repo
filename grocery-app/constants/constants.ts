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
  PROTECTED_ROUTE: `${BASE_URL}/protected`,
  GET_ITEMS_BY_USER: `${BASE_URL}/items/user`,
  GET_USERID_BY_EMAIL: `${BASE_URL}/user-id`,
  GET_LISTS_BY_USER: `${BASE_URL}/lists/user`,
  GET_LIST_BY_ID: `${BASE_URL}/lists`,
  ADD_LIST: `${BASE_URL}/lists`,
  ADD_ITEM: `${BASE_URL}/items`,
  PRODUCT_INFO: `${BASE_URL}/product-info`,
  // Add other endpoints as needed
};
