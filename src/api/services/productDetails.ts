import { API_CONFIG } from "../config"

export interface ProductDetail {
  _id: string
  uniqueId: string
  seq: number
  name: string
  description: string
  price: number
  category: string | { _id?: string; uniqueId?: string; name?: string; slug?: string }
  inStock: boolean
  images: string[]
  bannerImage: string
  appearance: string
  status: string
  createdAt: string
  updatedAt: string
  moq?: number
  unit?: string
  tags?: string[]
  applications?: string[]
  functions?: string[]
  countryOfOrigin?: string[]
  dietaryAttributes?: { title: string; logo?: string; certificateLink?: string }[]
}

export interface ProductDetailResponse {
  success: boolean
  data: ProductDetail
}

class ProductDetailService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    console.log(`Making request to: ${API_CONFIG.baseURL}${endpoint}`)

    try {
      const response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...API_CONFIG.headers,
          ...options?.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      console.log("API Response:", data)
      return data
    } catch (error) {
      console.error("API Request failed:", error)
      throw error
    }
  }

  async getProductDetail(productId: string): Promise<ProductDetailResponse> {
    const endpoint = `/public/products/details/${productId}`
    return this.request<ProductDetailResponse>(endpoint)
  }
}

export const productDetailService = new ProductDetailService()
