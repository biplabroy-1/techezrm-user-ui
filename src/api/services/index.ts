export { productService } from "./products";
export { orderService } from "./orders";
export { reviewService } from "./reviews";
export { customerAuthService } from "./customerAuth";
export { customerSignupService } from "./customerSignup";
export { categoryService } from "./categories";
export { certificateService } from "./certificates";
export { customerOrderService } from "./customerOrders";
export { rfqService } from "./rfq";
export { cartService } from "./cart";
export { customerAddressService } from "./customerAddress";
export { passwordChangeService } from "./passwordChange";
export { searchService } from "./search";
export { countriesService } from "./countries";
export { customerProfileService } from "./customerProfile";
export { stripeService } from "./stripe";
export { checkoutSessionsService } from "./checkoutSessions";
export { getCompanyDetails } from "./companyDetails";
export { mapsService } from "./maps";

// Product services
export * from "./products";
export * from "./productDetails";
export * from "./productVariants";

// Authentication services
export * from "./customerAuth";
export * from "./customerSignup";

// Order services
export * from "./orders";
export * from "./customerOrders";

// Review services
export * from "./reviews";

// Category services
export * from "./categories";

// Certificate services
export * from "./certificates";

// RFQ services
export * from "./rfq";

export type {
  Product,
  ProductsResponse,
  ProductListingParams,
} from "./products";
export type { Order, OrderItem, CreateOrderData } from "./orders";
export type {
  CustomerReview,
  ReviewsResponse,
  ReviewListingParams,
} from "./reviews";
export type {
  Customer,
  LoginCredentials as CustomerLoginCredentials,
  LoginResponse,
} from "./customerAuth";
export type {
  InitiateSignupRequest,
  InitiateSignupResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  CompleteSignupRequest,
  CompleteSignupResponse,
} from "./customerSignup";
export type {
  Category,
  CategoriesResponse,
  CategoryListingParams,
} from "./categories";
export type {
  Certificate,
  CertificatesResponse,
  CertificateListingParams,
  AssetLink,
} from "./certificates";
export type {
  CustomerOrder,
  CustomerOrderItem,
  CustomerOrderAddress,
  CustomerOrdersResponse,
  CustomerOrdersParams,
} from "./customerOrders";
export type { RFQRequest, RFQResponse } from "./rfq";
export * from "./wishlist";

// Cart services
export * from "./cart";

// Customer Address services
export * from "./customerAddress";

// Password Change services
export * from "./passwordChange";

// Search services
export * from "./search";

// Countries services
export * from "./countries";

// Customer Profile services
export * from "./customerProfile";

// Stripe services
export * from "./stripe";

// Company Details services
export * from "./companyDetails";

// Maps services
export * from "./maps";
