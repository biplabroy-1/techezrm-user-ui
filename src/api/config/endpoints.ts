export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    PROFILE: "/auth/profile",
  },

  // Customer Auth endpoints
  CUSTOMER_AUTH: {
    LOGIN: "/public/customer-auth/login/password",
    REGISTER: "/public/customer-auth/register",
    FORGOT_PASSWORD: "/public/customer-auth/forgot-password",
    RESET_PASSWORD: "/public/customer-auth/reset-password",
  },

  // Customer Signup endpoints
  CUSTOMER_SIGNUP: {
    INITIATE: "/public/customer-signup/initiate",
    VERIFY_OTP: "/public/customer-signup/verify-otp",
    COMPLETE: "/public/customer-signup/complete",
  },

  // Product endpoints
  PRODUCTS: {
    LISTING: "/public/products/listing",
    DETAIL: (id: string) => `/public/products/details/${id}`,
    SEARCH: "/public/products/search",
    CATEGORIES: "/public/products/categories",
    VARIANTS: (productId: string) =>
      `/public/product-variants/product/${productId}`,
  },

  // Order endpoints
  ORDERS: {
    LIST: "/orders",
    DETAIL: (id: string) => `/orders/${id}`,
    CREATE: "/orders",
    UPDATE: (id: string) => `/orders/${id}`,
    CANCEL: (id: string) => `/orders/${id}/cancel`,
  },

  // Customer Reviews endpoints
  REVIEWS: {
    LISTING: "/public/customer-reviews/listing",
    DETAIL: (id: string) => `/public/customer-reviews/${id}`,
    PRODUCT_REVIEWS: (productId: string) =>
      `/public/products/${productId}/reviews`,
    CREATE: "/reviews",
    UPDATE: (id: string) => `/reviews/${id}`,
    DELETE: (id: string) => `/reviews/${id}`,
  },

  // Shipments endpoints
  SHIPMENTS: {
    LIST: "/shipments",
    DETAIL: (id: string) => `/shipments/${id}`,
    TRACK: (trackingNumber: string) => `/shipments/track/${trackingNumber}`,
  },
  CATEGORIES: {
    LISTING: "/public/categories/listing",
    DETAIL: (id: string) => `/public/categories/${id}`,
    FEATURED: "/public/categories/listing?tag=Featured",
  },
  CERTIFICATES: {
    LISTING: "/public/certificates/listing",
    DETAIL: (id: string) => `/api/public/certificates/${id}`,
  },

  // Cart endpoints
  CART: {
    GET: "/public/cart",
    SUMMARY: "/public/cart/summary",
    ADD: "/public/cart/add",
    UPDATE: (productId: string) => `/public/cart/update/${productId}`,
    REMOVE: (productId: string) => `/public/cart/remove/${productId}`,
    CLEAR: "/public/cart/clear",
    VALIDATE: "/public/cart/validate",
  },

  // Customer Address endpoints
  CUSTOMER_ADDRESS: {
    LIST: (customerId: string) => `/public/customer-address/${customerId}`,
    DETAIL: (customerId: string, addressId: string) =>
      `/public/customer-address/${customerId}/${addressId}`,
    ADD: (customerId: string) => `/public/customer-address/${customerId}`,
    UPDATE: (customerId: string, addressId: string) =>
      `/public/customer-address/${customerId}/${addressId}`,
    DELETE: (customerId: string, addressId: string) =>
      `/public/customer-address/${customerId}/${addressId}`,
    SET_DEFAULT: (customerId: string, addressId: string) =>
      `/public/customer-address/${customerId}/${addressId}/default`,
  },

  // Password Change endpoints
  PASSWORD_CHANGE: {
    CHANGE: "/public/customer-auth/password",
  },

  // Search endpoints
  SEARCH: {
    QUERY: "/public/search",
    SUGGESTIONS:"/public/search/suggestions"
  },

  // Countries endpoints
  COUNTRIES: {
    LIST: "/public/constants/countries",
  },

  // Customer Profile endpoints
  CUSTOMER_PROFILE: {
    GET: (customerId: string) => `/public/customer-profile/${customerId}`,
    UPDATE: (customerId: string) => `/public/customer-profile/${customerId}`,
  },

  // Stripe endpoints
  STRIPE: {
    CREATE_PAYMENT_INTENT: "/public/stripe/payment-intents",
  },

  // RFQ endpoints
  RFQ: {
    SUBMIT: "/public/rfq/request-for-quotation",
    LISTING: "/public/rfq/get-all-listing",
  },
} as const;
