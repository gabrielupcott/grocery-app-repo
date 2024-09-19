// constants.ts
const BASE_URL = "http://10.0.2.2:8000";

// base url for web
// const BASE_URL = "http://127.0.0.1:8000";

export const API_URLS = {
  LOGIN: `${BASE_URL}/app-login`,
  REGISTER: `${BASE_URL}/register`,
  CONFIRM_REGISTRATION: `${BASE_URL}/confirm-registration`,
  RESEND_CONFIRMATION_CODE: "https://your-api-url/resend-confirmation-code",
  PROTECTED_ROUTE: `${BASE_URL}/protected`,
  GET_ITEMS_BY_USER: `${BASE_URL}/items/user`,
  GET_USERID_BY_EMAIL: `${BASE_URL}/user-id`,
  // Add other endpoints as needed
};
