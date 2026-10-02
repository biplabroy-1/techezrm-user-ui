import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5007";

export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  types: string[];
}

export interface AutocompleteResult {
  /**
   * An OpenStreetMap element id, e.g. "w:23733659". NOT a Google "ChIJ..." string -
   * this changed when maps moved off Google, so any id persisted before that is invalid
   * and must be looked up again.
   */
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  /**
   * Present on every suggestion, which is why selecting one needs no second request.
   * Optional only because older cached responses may predate this field.
   */
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PlaceDetails {
  /** OpenStreetMap element id, e.g. "w:23733659". */
  place_id: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

class MapsService {
  private baseURL = `${API_BASE_URL}/public/maps`;

  /**
   * Convert address to coordinates
   */
  async geocode(address: string): Promise<GeocodeResult[]> {
    try {
      const response = await axios.get<ApiResponse<GeocodeResult[]>>(
        `${this.baseURL}/geocode`,
        {
          params: { address },
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Geocoding failed");
    } catch (error) {
      console.error("Geocoding error:", error);
      throw error;
    }
  }

  /**
   * Convert coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult[]> {
    try {
      const response = await axios.get<ApiResponse<GeocodeResult[]>>(
        `${this.baseURL}/reverse-geocode`,
        {
          params: { lat, lng },
        }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Reverse geocoding failed");
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      throw error;
    }
  }

  /**
   * Get place autocomplete suggestions
   */
  /**
   * Get place autocomplete suggestions.
   *
   * `radius` and `types` were Google parameters. The OpenStreetMap providers bias by
   * coordinate pair rather than by radius and have no Google place-type taxonomy, so
   * neither is sent - passing them would suggest a filtering that is not happening.
   */
  async getAutocompleteSuggestions(
    input: string,
    lat?: number,
    lng?: number
  ): Promise<AutocompleteResult[]> {
    try {
      const params: any = { input };
      if (lat !== undefined) params.lat = lat;
      if (lng !== undefined) params.lng = lng;

      const response = await axios.get<ApiResponse<AutocompleteResult[]>>(
        `${this.baseURL}/autocomplete`,
        { params }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Autocomplete failed");
    } catch (error) {
      console.error("Autocomplete error:", error);
      throw error;
    }
  }

  /**
   * Get detailed information about a place by its OpenStreetMap element id.
   *
   * No `fields` parameter: the OSM providers have no field-masking concept, and the
   * previous Google field list (rating, photos, opening hours) has no equivalent here.
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const response = await axios.get<ApiResponse<PlaceDetails>>(
        `${this.baseURL}/place-details`,
        { params: { placeId } }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Place details failed");
    } catch (error) {
      console.error("Place details error:", error);
      throw error;
    }
  }

  /**
   * Search for places by text query
   */
  async searchPlaces(
    query: string,
    lat?: number,
    lng?: number,
    radius?: number,
    type?: string
  ): Promise<PlaceDetails[]> {
    try {
      const params: any = { query };
      if (lat !== undefined) params.lat = lat;
      if (lng !== undefined) params.lng = lng;
      if (radius !== undefined) params.radius = radius;
      if (type !== undefined) params.type = type;

      const response = await axios.get<ApiResponse<PlaceDetails[]>>(
        `${this.baseURL}/search-places`,
        { params }
      );

      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Place search failed");
    } catch (error) {
      console.error("Place search error:", error);
      throw error;
    }
  }
}

export const mapsService = new MapsService();
