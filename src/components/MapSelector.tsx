"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Navigation, MapPin } from "lucide-react";
import { mapsService, AutocompleteResult, GeocodeResult } from "@/api/services/maps";
import { Spinner } from "@/components/ui/spinner";

/**
 * Address picker on a Leaflet + OpenStreetMap basemap.
 *
 * Replaces a Google Maps embed. Same public contract as before - `onLocationSelect(lat,
 * lng, address)` - so `AddressModal` needed no changes.
 *
 * SEARCH BEHAVIOUR IS DELIBERATELY SLOWER THAN THE GOOGLE VERSION. Nominatim's published
 * policy allows one request per second, so the debounce is 1100ms and the input is not
 * queried until the user pauses. Suggestions therefore appear about a second after they
 * stop typing rather than per keystroke.
 */

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialCenter?: { lat: number; lng: number };
  height?: string;
}

/**
 * Nominatim allows 1 request/second. Anything faster invites a rate-limit block, and a
 * block would take out every address feature on the site at once.
 */
const SEARCH_DEBOUNCE_MS = 1100;

/** Below this, the query is too short to give useful suggestions. */
const MIN_QUERY_LENGTH = 3;

/**
 * Leaflet's default marker images resolve relative to the stylesheet, which breaks under
 * bundlers and produces a broken-image marker. This is the standard fix, and matches
 * what `admin-ui/src/components/RouteMap.tsx` already does.
 */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/** The brand-coloured dot used for the selected location. */
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background-color:var(--color-brand);border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);cursor:pointer"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/**
 * Reports map clicks upward.
 *
 * A child component rather than an effect on the parent: `useMapEvents` needs the Leaflet
 * map instance, which only exists once `MapContainer` has mounted. Doing this in an
 * effect keyed on props would re-register the handler on every render.
 */
const ClickHandler: React.FC<{
  onClick: (lat: number, lng: number) => void;
}> = ({ onClick }) => {
  useMapEvents({
    click: (event) => onClick(event.latlng.lat, event.latlng.lng),
  });
  return null;
};

const MapSelector: React.FC<MapSelectorProps> = ({
  onLocationSelect,
  initialCenter = { lat: 40.7128, lng: -74.006 },
  height = "500px",
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(initialCenter);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Monotonic request counter.
   *
   * Debounced search means responses can arrive out of order: the user types "am", pauses,
   * then types "amph" before the first request returns. Without this guard the slower
   * first response overwrites the newer results and the dropdown shows stale suggestions.
   */
  const requestSeqRef = useRef(0);

  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom ?? Math.max(map.getZoom(), 15));
  }, []);

  const debouncedSearch = useCallback(
    (query: string, location: { lat: number; lng: number }) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      if (query.trim().length < MIN_QUERY_LENGTH) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        const seq = ++requestSeqRef.current;
        try {
          setIsLoading(true);
          setSearchError(null);
          const results = await mapsService.getAutocompleteSuggestions(
            query,
            location.lat,
            location.lng
          );
          // A newer request has already started; this answer is stale.
          if (seq !== requestSeqRef.current) return;
          setSuggestions(results);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } catch (error: any) {
          if (seq !== requestSeqRef.current) return;
          // A 429 is the rate limiter doing its job, not a failure worth interrupting
          // the user for. Hide the dropdown and leave their typed text alone.
          if (error?.response?.status === 429) {
            setSuggestions([]);
            setShowSuggestions(false);
          } else {
            setSearchError("Address lookup is unavailable. Type the address instead.");
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } finally {
          if (seq === requestSeqRef.current) setIsLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  useEffect(
    () => () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    },
    []
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      debouncedSearch(value, currentLocation);
    },
    [debouncedSearch, currentLocation]
  );

  /**
   * Select a suggestion.
   *
   * Photon returns coordinates with every suggestion, so this resolves locally - no
   * second request. Google's autocomplete omitted geometry and needed a follow-up
   * `place-details` call for every click.
   */
  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteResult) => {
      // `geometry` is non-optional in the type, so these are plain reads. The guard is
      // kept as a runtime backstop: an untyped or proxied API response would otherwise
      // silently make every suggestion unselectable, which is exactly the bug this
      // function used to have.
      const lat = suggestion.geometry?.location?.lat;
      const lng = suggestion.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") {
        console.error("Autocomplete suggestion arrived without coordinates", suggestion);
        return;
      }

      setCurrentLocation({ lat, lng });
      panTo(lat, lng, 16);
      onLocationSelect(lat, lng, suggestion.description || "");
      setSearchInput(suggestion.description || "");
      setShowSuggestions(false);
      setSuggestions([]);
    },
    [onLocationSelect, panTo]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((p) => (p < suggestions.length - 1 ? p + 1 : p));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((p) => (p > 0 ? p - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSuggestionSelect(suggestions[selectedIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSuggestionSelect]
  );

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) return;
    const seq = ++requestSeqRef.current;
    try {
      setIsLoading(true);
      setSearchError(null);
      const results: GeocodeResult[] = await mapsService.geocode(searchInput);
      if (seq !== requestSeqRef.current) return;
      if (results.length > 0) {
        const { lat, lng } = results[0].geometry.location;
        setCurrentLocation({ lat, lng });
        panTo(lat, lng);
        onLocationSelect(lat, lng, results[0].formatted_address);
        setShowSuggestions(false);
      } else {
        setSearchError("No matching address found.");
      }
    } catch (error) {
      if (seq === requestSeqRef.current) {
        setSearchError("Address lookup is unavailable. Type the address instead.");
      }
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [searchInput, onLocationSelect, panTo]);

  const handleCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setSearchError("This browser cannot detect your location. Type the address instead.");
      return;
    }
    const seq = ++requestSeqRef.current;
    try {
      setIsLoading(true);
      const position = await new Promise<GeolocationPosition | null>((resolve) =>
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null))
      );
      if (!position) {
        setSearchError(
          "Could not get your location. Allow location access, or type the address."
        );
        return;
      }
      if (seq !== requestSeqRef.current) return;

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setCurrentLocation({ lat, lng });
      panTo(lat, lng);

      // The GPS fix is real data and worth keeping even if the lookup fails, so the
      // coordinates are already committed above. Report the fallback address either way.
      try {
        const results = await mapsService.reverseGeocode(lat, lng);
        if (seq !== requestSeqRef.current) return;
        const address = results[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        onLocationSelect(lat, lng, address);
        setSearchInput(results[0]?.formatted_address || "");
      } catch {
        if (seq === requestSeqRef.current) {
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      }
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [onLocationSelect, panTo]);

  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const seq = ++requestSeqRef.current;
      setCurrentLocation({ lat, lng });
      try {
        const results = await mapsService.reverseGeocode(lat, lng);
        if (seq !== requestSeqRef.current) return;
        const address = results[0]?.formatted_address;
        if (address) {
          onLocationSelect(lat, lng, address);
          setSearchInput(address);
        }
      } catch {
        // A failed reverse lookup still leaves valid coordinates on the map. Leave them
        // there and let the user correct the address by typing.
      }
    },
    [onLocationSelect]
  );

  return (
    <div style={{ height }} className="relative">
      {/* Search Box */}
      <div className="absolute top-3 left-3 right-3 z-[1000] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.12)] p-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search for an address..."
              value={searchInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full border border-line-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand hover:border-line-light transition-colors"
            />
            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-[200px] overflow-auto z-[1001] shadow-[0_4px_16px_rgba(0,0,0,0.1)] border border-line-light rounded-xl bg-white">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.place_id}
                    type="button"
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${selectedIndex === index ? "bg-brand text-white" : "hover:bg-paper"}`}
                  >
                    <MapPin
                      className={`w-4 h-4 flex-shrink-0 ${selectedIndex === index ? "text-white" : "text-brand"}`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-[0.8rem] font-medium truncate ${selectedIndex === index ? "text-white" : "text-body"}`}
                      >
                        {suggestion.structured_formatting.main_text}
                      </p>
                      <p
                        className={`text-[0.7rem] truncate ${selectedIndex === index ? "text-white/80" : "text-dim"}`}
                      >
                        {suggestion.structured_formatting.secondary_text}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover disabled:bg-line-light text-white text-[0.8rem] font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" /> Search
          </button>
          <button
            onClick={handleCurrentLocation}
            disabled={isLoading}
            className="flex items-center gap-1.5 border border-brand text-brand hover:bg-[rgba(249,169,34,0.04)] disabled:border-line-light disabled:text-line-light text-[0.8rem] font-medium px-2.5 py-2 rounded-lg transition-colors"
          >
            <Navigation className="w-4 h-4" /> My Location
          </button>
        </div>
        {searchError && (
          <p className="text-[0.7rem] text-danger mt-2">{searchError}</p>
        )}
      </div>

      {/* Map Container */}
      <div className="h-full w-full rounded-lg overflow-hidden relative">
        <MapContainer
          center={[currentLocation.lat, currentLocation.lng]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          attributionControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleMapClick} />
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={pinIcon}
          />
        </MapContainer>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[200]">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" className="border-brand border-t-transparent" />
              <span className="text-sm text-dim">Looking up address...</span>
            </div>
          </div>
        )}

        {/* Coordinates */}
        <div className="absolute bottom-3 right-3 bg-white/95 rounded px-2 py-1 text-xs text-dim shadow-[0_2px_4px_rgba(0,0,0,0.1)] border border-black/10 z-[1000]">
          {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-3 left-3 bg-white/95 rounded-xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.12)] max-w-[280px] z-[1000]">
        <p className="text-[0.75rem] font-semibold text-dim mb-1">Instructions:</p>
        {[
          "Type for address suggestions",
          "Use ↑↓ arrows, Enter to select",
          "Click map to select location",
          'Use "My Location" for GPS',
        ].map((t) => (
          <p key={t} className="text-[0.7rem] text-dim mb-0.5">
            • {t}
          </p>
        ))}
      </div>
    </div>
  );
};

export default MapSelector;