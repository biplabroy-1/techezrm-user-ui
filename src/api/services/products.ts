import { API_CONFIG, ENDPOINTS } from "../config";

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string | { _id?: string; uniqueId?: string; name?: string; slug?: string };
  inStock: boolean;
  images: string[];
  bannerImage?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  uniqueId: string;
  __v: number;
  appearance?: string;
  moq?: number;
  unit?: string;
  tags?: string[];
  applications?: string[];
  functions?: string[];
  countryOfOrigin?: string[];
  dietaryAttributes?: { title: string; logo?: string; certificateLink?: string }[];
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProductListingParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  category?: string;
  subCategory?: string[];
  application?: string[];
  tag?: string[];
  function?: string[];
  search?: string;
  countryOfOrigin?: string;
}

class ProductService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getProductListing(
    params: ProductListingParams = {}
  ): Promise<ProductsResponse> {
    const searchParams = new URLSearchParams();

    // Set default values
    const defaultParams = {
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc" as const,
      ...params,
    };

    Object.entries(defaultParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array parameters by joining with commas
          searchParams.append(key, value.join(","));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `${ENDPOINTS.PRODUCTS.LISTING}?${queryString}`;

    return this.request<ProductsResponse>(endpoint);
  }

  async getProduct(id: string): Promise<Product> {
    const endpoint = ENDPOINTS.PRODUCTS.DETAIL(id);
    const response = await this.request<{ success: boolean; product: Product }>(
      endpoint
    );
    return response.product;
  }
}

export const productService = new ProductService();
