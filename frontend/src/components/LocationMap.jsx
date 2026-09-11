import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Search } from "lucide-react";

export const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyB0OMqh_jRy7liOFTNBHXuTO7vBsJNVpIg";

// Carga dinámica (una sola vez) de la API JS de Google Maps.
// Reusa window.google.maps si ya existe; si el script ya se está cargando, espera su onload.
let googleMapsPromise = null;
export const loadGoogleMaps = () => {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("google-maps-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-js";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleMapsPromise;
};

// Map Component with draggable pin using Google Maps
export const LocationMap = ({ latitude, longitude, onLocationChange, address, autoSearch, extraAction }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const lastSearchedRef = useRef("");

  // Refs del mapa interactivo
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  // Últimas coords aplicadas por el propio mapa (para no reposicionar en loop)
  const selfUpdateRef = useRef({ lat: null, lng: null });

  // Coords más recientes: el init del mapa es async; sin esto centraría en el
  // default (CDMX) si lat/lng cambian (geocode/restauración) antes de cargar la API.
  const coordsRef = useRef({ lat: latitude, lng: longitude });
  coordsRef.current = { lat: latitude, lng: longitude };

  // Inicializa el mapa una sola vez cuando la API está disponible
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;

        const center = coordsRef.current;
        const map = new maps.Map(mapContainerRef.current, {
          center,
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const marker = new maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        const applyChange = (lat, lng) => {
          selfUpdateRef.current = { lat, lng };
          onLocationChangeRef.current(lat, lng);
        };

        marker.addListener("dragend", (e) => {
          applyChange(e.latLng.lat(), e.latLng.lng());
        });
        map.addListener("click", (e) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          marker.setPosition({ lat, lng });
          applyChange(lat, lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reacciona a cambios de lat/lng desde afuera (geocode, formulario) sin crear loops
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const self = selfUpdateRef.current;
    // Si este cambio lo provocó el propio mapa, no reposicionar
    if (
      self.lat !== null &&
      Math.abs(self.lat - latitude) < 1e-9 &&
      Math.abs(self.lng - longitude) < 1e-9
    ) {
      return;
    }
    const pos = { lat: latitude, lng: longitude };
    markerRef.current.setPosition(pos);
    mapRef.current.panTo(pos);
  }, [latitude, longitude]);

  const searchLocation = useCallback(async (query, isAuto = false) => {
    if (!query || query.trim().length < 8 || query === lastSearchedRef.current) return;

    setIsSearching(true);
    lastSearchedRef.current = query;
    try {
      if (!window.google?.maps?.Geocoder) {
        if (!isAuto) toast.error("Mapa aún no está listo");
        return false;
      }
      const geocoder = new window.google.maps.Geocoder();
      const result = await geocoder.geocode({
        address: query,
        componentRestrictions: { country: "MX" },
      }).catch(() => null);

      if (result && result.results && result.results.length > 0) {
        const loc = result.results[0].geometry.location;
        const nLat = loc.lat();
        const nLon = loc.lng();

        if (Math.abs(nLat - latitude) > 0.0001 || Math.abs(nLon - longitude) > 0.0001) {
          onLocationChangeRef.current(nLat, nLon);
          if (!isAuto) toast.success("Ubicación encontrada");
        }
        return true;
      } else {
        if (!isAuto) toast.error("No se encontró la ubicación exacta");
        return false;
      }
    } catch (error) {
      if (!isAuto) toast.error("Error al buscar ubicación");
      return false;
    } finally {
      setIsSearching(false);
    }
  }, [latitude, longitude]);

  // Auto-search (debounce)
  useEffect(() => {
    if (!address || !autoSearch || address === lastSearchedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (address.trim().length > 8 && address !== lastSearchedRef.current) {
        setSearchQuery(address);
        searchLocation(address, true);
      }
    }, 1200);
    return () => clearTimeout(debounceRef.current);
  }, [address, autoSearch, searchLocation]);

  useEffect(() => {
    if (address && address !== searchQuery) {
      setSearchQuery(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar dirección en el mapa..."
          className="h-10"
          onKeyPress={(e) => e.key === 'Enter' && searchLocation(searchQuery)}
        />
        <Button
          type="button"
          onClick={() => searchLocation(searchQuery)}
          disabled={isSearching}
          className="bg-[#52B788] hover:bg-[#40916C] text-white"
        >
          {isSearching ? <Search className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        {extraAction}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-200" style={{ height: "280px" }}>
        <div ref={mapContainerRef} className="w-full h-full" />
        {mapError && (
          // Respaldo: si la JS API no está habilitada en la key, mostramos el mapa
          // embebido (no arrastrable, pero visible). Se vuelve interactivo al habilitar
          // "Maps JavaScript API" en la key de Google.
          <iframe
            title="Ubicación"
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            style={{ border: 0 }}
            src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${latitude},${longitude}&zoom=16`}
            allowFullScreen
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm gap-2 flex-wrap">
        <span className="text-slate-500">
          <MapPin className="w-4 h-4 inline mr-1" />
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
        <span className="text-xs text-[#1B4332] font-medium">
          Arrastra el pin o toca el mapa para corregir la ubicación exacta
        </span>
      </div>
    </div>
  );
};
