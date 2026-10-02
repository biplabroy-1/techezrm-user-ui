"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { X, CheckCircle2, Clock, Circle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDate } from "@/utils/dateUtils";

/** Leaflet needs the map instance once mounted, and it only exists inside MapContainer. */
type LeafletMap = L.Map;

const getMarkerColor = (status: "completed" | "current" | "pending") => {
  switch (status) {
    case "completed": return "var(--color-success)";
    case "current": return "var(--color-brand)";
    case "pending": return "#9E9E9E";
    default: return "var(--color-brand)";
  }
};

/** Leaflet's default marker images resolve relative to the CSS, which breaks under bundlers. */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/**
 * Status-coloured emoji pin, as an HTML div icon.
 *
 * Was an inline SVG data URI under Google Maps. `divIcon` takes HTML instead, which is
 * closer to how `admin-ui`'s RouteMap renders its markers and lets the CSS variables
 * resolve normally rather than inside a serialised SVG.
 */
const createPinIcon = (status: string, emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:40px;height:40px;border-radius:50%;background-color:${getMarkerColor(
      status as "completed" | "current" | "pending"
    )};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

/** The moving dot shown during the journey animation. */
const movingDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background-color:var(--color-brand);border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface TrackingData {
  id: number;
  location: string;
  coordinates: [number, number];
  status: "completed" | "current" | "pending";
  timestamp: string;
  description: string;
  icon: string;
}

interface TrackingPoint {
  lat: number;
  lng: number;
  icon: string;
  label: string;
  status: "completed" | "current" | "pending";
}

interface TrackingModalProps {
  open: boolean;
  onClose: () => void;
  trackingNumber?: string;
  trackingData: TrackingData[];
  trackingPoints: TrackingPoint[];
}

const statusBadge = (status: string) => {
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "current") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-700 border border-gray-300";
};

/**
 * Fits the route after the map has laid out.
 *
 * `fitBounds` on mount is unreliable because the container has zero height at that point,
 * producing a garbage fit. `whenReady` fires once Leaflet has real dimensions, and
 * `invalidateSize` forces a re-measure of the container that was hidden while the modal
 * was closed.
 */
const FitOnMount: React.FC<{
  positions: Array<[number, number]>;
  maxZoom: number;
}> = ({ positions, maxZoom }) => {
  const map = useMap();
  useEffect(() => {
    // Uses the `map` from useMap rather than a ref passed down, so the fit does not
    // depend on the parent's ref having been assigned yet - child effects can run before
    // it, and a null ref here silently skips the initial fit.
    map.whenReady(() => {
      map.invalidateSize();
      if (positions.length === 0) return;
      if (positions.length === 1) {
        map.setView(positions[0], maxZoom);
        return;
      }
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
      if (map.getZoom() > maxZoom) map.setZoom(maxZoom);
    });
    // Intentionally runs once: later changes are handled by the Fit-to-Route button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const TrackingModal: React.FC<TrackingModalProps> = ({ open, onClose, trackingNumber, trackingData, trackingPoints }) => {
  const [selectedLocation, setSelectedLocation] = React.useState<number | null>(null);
  const [isZooming, setIsZooming] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [currentAnimationIndex, setCurrentAnimationIndex] = React.useState(0);
  const [movingDotPosition, setMovingDotPosition] = React.useState<{ lat: number; lng: number } | null>(null);

  /**
   * How far out the map may zoom when fitting the whole route.
   *
   * A shipment route spans a country, and `fitBounds` on such a spread lands at zoom 5 or
   * so, where individual stops are unreadable and the line looks like a single dot. This
   * cap forces at least a regional view, matching what the Google version did with its
   * `bounds_changed` listener.
   */
  const MAX_FIT_ZOOM = 8;

  const routePositions = useMemo(
    () =>
      (trackingPoints ?? [])
        .filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number")
        .map((p) => [p.lat, p.lng] as [number, number]),
    [trackingPoints]
  );

  /**
   * Imperative map operations (fit-to-route, fly to a point) live in a ref, not state.
   * Storing the Leaflet instance in state caused a re-render on every map interaction,
   * which is both wasteful and a way to get render loops.
   */
  const mapRef = useRef<LeafletMap | null>(null);

  /**
   * Timer for the journey animation.
   *
   * Tracked so that stopping mid-run, closing the modal, or unmounting cannot leave a
   * queued tick that fires against a cancelled animation or a torn-down map.
   */
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) mapRef.current?.invalidateSize();
  }, [open]);

  // Without this, closing the modal mid-animation leaves a queued setTimeout that fires
  // against a map Leaflet has already torn down.
  useEffect(
    () => () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    },
    []
  );

  const startJourneyAnimation = () => {
    if (!trackingData || trackingData.length === 0 || isAnimating) return;
    setIsAnimating(true);
    setCurrentAnimationIndex(0);

    const animateToNextPoint = (index: number) => {
      if (index >= trackingData.length) {
        setIsAnimating(false);
        setMovingDotPosition(null);
        return;
      }
      const point = trackingData[index];
      if (point?.coordinates) {
        // coordinates are [lng, lat] - GeoJSON order, which is easy to invert by mistake
        // and drops the marker at the wrong side of the world.
        const [lng, lat] = point.coordinates;
        setSelectedLocation(point.id);
        setMovingDotPosition({ lat, lng });
        mapRef.current?.panTo([lat, lng]);
        animationTimerRef.current = setTimeout(() => {
          setCurrentAnimationIndex(index + 1);
          animateToNextPoint(index + 1);
        }, 2000);
      }
    };
    animateToNextPoint(0);
  };

  const stopJourneyAnimation = () => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    setIsAnimating(false);
    setCurrentAnimationIndex(0);
    setMovingDotPosition(null);
  };

  /**
   * Centres the map on every tracking point, capped at a readable zoom.
   *
   * `fitBounds` panics on an empty list, and a single point has no extent to fit, so
   * both cases fall back to `setView`.
   */
  const fitToRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    if (routePositions.length === 0) return;
    if (routePositions.length === 1) {
      map.setView(routePositions[0], MAX_FIT_ZOOM);
      return;
    }
    map.fitBounds(L.latLngBounds(routePositions), { padding: [50, 50] });
    if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
  };

  const handleLocationClick = (point: TrackingData) => {
    if (!point?.coordinates) return;
    // coordinates are [lng, lat].
    const [lng, lat] = point.coordinates;
    setSelectedLocation(point?.id);
    setIsZooming(true);
    const zoomLevel = point.status === "current" ? 10 : 8;
    mapRef.current?.flyTo([lat, lng], zoomLevel, { duration: 0.6 });
    setTimeout(() => setIsZooming(false), 800);
  };

  if (!open) return null;

  return (
    <>
      <style>{`@keyframes zoomIn{0%{transform:scale(1);box-shadow:0 4px 12px rgba(255,107,53,0.2)}50%{transform:scale(1.05);box-shadow:0 8px 25px rgba(255,107,53,0.4)}100%{transform:scale(1);box-shadow:0 4px 12px rgba(255,107,53,0.2)}}.zoom-animation{animation:zoomIn 0.8s ease-in-out}`}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="bg-white rounded-lg w-[95%] md:w-[90%] lg:w-[80%] max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-line-light">
            <div className="flex items-center gap-3">
              <span className="text-brand text-xl">📍</span>
              <div>
                <h2 className="text-xl font-semibold text-heading">Track Your Package</h2>
                <p className="text-sm text-dim">Tracking Number: {trackingNumber || "N/A"}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-dim hover:text-body hover:bg-paper rounded-full p-1.5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* Map */}
            <div className="flex-1 relative bg-wash min-h-[500px] overflow-hidden">
              <div className="h-[500px] w-full">
                <MapContainer
                  center={routePositions[0] ?? [0, 0]}
                  zoom={2}
                  style={{ height: "100%", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {/* Fit the route once the map exists and has real dimensions. */}
                  <FitOnMount positions={routePositions} maxZoom={MAX_FIT_ZOOM} />

                  {/*
                    Straight segments between stops. The Google version asked for
                    `geodesic: true`, which curved the line along great circles; Leaflet
                    has no equivalent. For the distances involved the two are visually
                    near-identical, and inventing a curve here would misrepresent the
                    actual path.
                  */}
                  {routePositions.length > 1 && (
                    <Polyline
                      positions={routePositions}
                      pathOptions={{
                        color: "#ff6b35",
                        opacity: 1.0,
                        weight: 5,
                        // Leaflet names this `interactive`, not `clickable`.
                        interactive: false,
                      }}
                    />
                  )}
                  {movingDotPosition && (
                    <Marker
                      position={[movingDotPosition.lat, movingDotPosition.lng]}
                      icon={movingDotIcon}
                      interactive={false}
                      zIndexOffset={1000}
                    />
                  )}
                  {trackingPoints?.map((point, index) => (
                    <Marker
                      key={index}
                      position={[point?.lat ?? 0, point?.lng ?? 0]}
                      icon={createPinIcon(point?.status || "pending", point?.icon || "📍")}
                      eventHandlers={{
                        click: () => {
                          const td = trackingData?.find(
                            (t) =>
                              t?.coordinates?.[0] === point?.lng &&
                              t?.coordinates?.[1] === point?.lat
                          );
                          if (td) handleLocationClick(td);
                        },
                      }}
                    />
                  ))}
                </MapContainer>
              </div>

              {/* Custom controls */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-[1000]">
                <button
                  onClick={isAnimating ? stopJourneyAnimation : startJourneyAnimation}
                  title={isAnimating ? "Stop Journey" : "Start Journey"}
                  className="w-10 h-10 rounded flex items-center justify-center text-white text-base font-bold transition-all hover:scale-[1.08]"
                  style={{
                    backgroundColor: isAnimating ? "var(--color-danger)" : "var(--color-success)",
                    boxShadow: `0 2px 8px ${isAnimating ? "rgba(220,53,69,0.3)" : "rgba(40,167,69,0.3)"}`,
                  }}
                >
                  {isAnimating ? "⏹️" : "▶️"}
                </button>
                <button
                  onClick={fitToRoute}
                  title="Fit to Route"
                  className="w-10 h-10 bg-brand rounded flex items-center justify-center text-base font-bold text-white shadow-[0_2px_8px_rgba(255,107,53,0.3)] hover:bg-brand-hover hover:scale-[1.08] transition-all"
                >
                  🗺️
                </button>
              </div>
            </div>

            {/* Tracking History */}
            <div className="w-[400px] border-l border-line-light overflow-y-auto bg-paper">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Tracking History</h3>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[20px] top-5 bottom-5 w-0.5 bg-line-light rounded z-0" />

                  {trackingData?.map((point) => (
                    <div key={point?.id} className="mb-6 relative">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-[11px] top-[15px] w-5 h-5 rounded-full bg-white flex items-center justify-center z-[2] shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                        style={{ border: `3px solid ${point?.status === "completed" ? "var(--color-success)" : point?.status === "current" ? "var(--color-brand)" : "var(--color-line-light)"}` }}
                      >
                        {point?.status === "completed" ? (
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : point?.status === "current" ? (
                          <Clock className="w-3 h-3 text-brand" />
                        ) : (
                          <Circle className="w-3 h-3 text-line-light" />
                        )}
                      </div>

                      {/* Content Card */}
                      <div
                        onClick={() => handleLocationClick(point)}
                        className={`ml-[40px] p-3 rounded cursor-pointer relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(255,107,53,0.4)] hover:border-2 hover:border-brand hover:bg-brand-light ${selectedLocation === point?.id ? "bg-brand-light shadow-[0_4px_12px_rgba(255,107,53,0.2)] border-2 border-brand" : point?.status === "current" ? "border-2 border-brand bg-white" : "border border-line-light bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]"} ${selectedLocation === point?.id && isZooming ? "zoom-animation" : ""}`}
                      >
                        {/* Arrow */}
                        <div className="absolute left-[-8px] top-[15px] w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white z-[1]" />

                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{point?.location || "N/A"}</span>
                          <span className={`text-[10px] ${selectedLocation === point?.id && isZooming ? "text-success font-bold" : "text-brand"} opacity-70`}>
                            {selectedLocation === point?.id && isZooming ? "Zooming..." : "Click to focus"}
                          </span>
                        </div>
                        <p className="text-sm text-dim mb-2">{point?.description || "N/A"}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-faint">{formatDate(point?.timestamp)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(point?.status || "pending")}`}>
                            {point?.status || "pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrackingModal;
