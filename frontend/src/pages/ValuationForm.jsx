import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Ruler,
  Home,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  CheckCircle2,
  Upload,
  X,
  Image as ImageIcon,
  Map,
  BedDouble,
  Bath,
  Car,
  Warehouse,
  Layers,
  Building,
  FileText,
  Trees,
  Waves,
  Dumbbell,
  Shield,
  ArrowUpDown,
  Flower2,
  WashingMachine,
  DoorOpen,
  Utensils,
  PlusCircle,
  Search,
  RefreshCw,
  Sun,
  Thermometer,
  Droplets,
  Zap,
  Wind,
  Info
} from "lucide-react";
import { API } from "@/App";

const MEXICAN_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

const LAND_REGIMES = [
  { value: "URBANO", label: "Urbano" },
  { value: "PRIVADO", label: "Privado" },
  { value: "CONDOMINIO_HORIZONTAL", label: "Privado en Condominio Horizontal" },
  { value: "CONDOMINIO_VERTICAL", label: "Privado en Condominio Vertical" },
  { value: "EJIDAL", label: "Ejidal" },
  { value: "COMUNAL", label: "Comunal" },
  { value: "RUSTICO", label: "Rústico" }
];

const PROPERTY_TYPES = [
  { value: "Casa", label: "Casa", icon: Home },
  { value: "Departamento", label: "Departamento", icon: Building },
  { value: "Terreno", label: "Terreno", icon: Trees },
  { value: "Local comercial", label: "Local Comercial", icon: Building2 },
  { value: "Oficina", label: "Oficina", icon: FileText },
  { value: "Bodega", label: "Bodega", icon: Warehouse },
  { value: "Nave industrial", label: "Nave Industrial", icon: Building2 }
];

const CONSTRUCTION_QUALITIES = [
  { value: "Interés social", label: "Interés Social" },
  { value: "Media", label: "Media" },
  { value: "Media-alta", label: "Media-Alta" },
  { value: "Residencial", label: "Residencial" },
  { value: "Residencial plus", label: "Residencial Plus / Lujo" }
];

const CONSERVATION_STATES = [
  { value: "Excelente", label: "Excelente", color: "text-green-600" },
  { value: "Bueno", label: "Bueno", color: "text-blue-600" },
  { value: "Regular", label: "Regular", color: "text-amber-600" },
  { value: "Malo", label: "Malo", color: "text-red-600" }
];

// Catálogo basado en Reglamento de Zonificación de Jalisco
const LAND_USE_TYPES = [
  { value: "H1-U", label: "H1-U - Habitacional Unifamiliar" },
  { value: "H2-U", label: "H2-U - Habitacional Dúplex Unifamiliar" },
  { value: "H3-U", label: "H3-U - Habitacional Tríplex Unifamiliar" },
  { value: "H2-H", label: "H2-H - Habitacional Plurifamiliar Horizontal" },
  { value: "H2-V", label: "H2-V - Habitacional Plurifamiliar Vertical Baja" },
  { value: "H3-V", label: "H3-V - Habitacional Plurifamiliar Vertical Media" },
  { value: "H4-V", label: "H4-V - Habitacional Plurifamiliar Vertical Alta" },
  { value: "HM", label: "HM - Habitacional Mixto" },
  { value: "HC", label: "HC - Habitacional con Comercio Vecinal" },
  { value: "HO", label: "HO - Habitacional con Oficinas" },
  { value: "CU", label: "CU - Comercio y Servicios Uniforme" },
  { value: "CB", label: "CB - Centro de Barrio" },
  { value: "CD", label: "CD - Centro de Distrito" },
  { value: "CS", label: "CS - Corredor de Servicios" },
  { value: "CC", label: "CC - Centro Comercial" },
  { value: "CR", label: "CR - Corredor Regional" },
  { value: "I-L", label: "I-L - Industrial Ligera" },
  { value: "I-M", label: "I-M - Industrial Media" },
  { value: "I-P", label: "I-P - Industrial Pesada" },
  { value: "IP", label: "IP - Industria Parque" },
  { value: "EA", label: "EA - Espacios Abiertos / Áreas Verdes" },
  { value: "EI", label: "EI - Equipamiento Institucional" },
  { value: "PE", label: "PE - Preservación Ecológica" },
  { value: "AG", label: "AG - Agrícola" },
  { value: "desconocido", label: "Por verificar (la IA lo determinará)" }
];

// Características especiales con iconos coherentes
const SPECIAL_FEATURES = [
  { id: "parking", label: "Estacionamiento", icon: Car },
  { id: "pool", label: "Alberca", icon: Waves },
  { id: "garden", label: "Jardín", icon: Flower2 },
  { id: "patio", label: "Patio", icon: Trees },
  { id: "terrace", label: "Terraza", icon: Layers },
  { id: "gym", label: "Gimnasio", icon: Dumbbell },
  { id: "security", label: "Seguridad 24/7", icon: Shield },
  { id: "elevator", label: "Elevador", icon: ArrowUpDown },
  { id: "rooftop", label: "Roof Garden", icon: Trees },
  { id: "service_room", label: "Cuarto de Servicio", icon: DoorOpen },
  { id: "laundry_room", label: "Cuarto de Lavado", icon: WashingMachine },
  { id: "storage", label: "Bodega/Almacén", icon: Warehouse },
  { id: "kitchen_integral", label: "Cocina Integral", icon: Utensils },
  { id: "solar_panels", label: "Paneles Solares", icon: Sun },
  { id: "solar_heater", label: "Calentador Solar", icon: Thermometer },
  { id: "cistern", label: "Cisterna", icon: Droplets },
  { id: "electric_fence", label: "Cerca Eléctrica", icon: Zap },
  { id: "ac", label: "Aire Acondicionado", icon: Wind }
];

const SURFACE_SOURCES = [
  { value: "Escrituras", label: "Escrituras" },
  { value: "Plano", label: "Plano" },
  { value: "Predial", label: "Predial" },
  { value: "Medidas Físicas", label: "Medidas Físicas" }
];

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Map Component with draggable pin using Google Maps
const LocationMap = ({ latitude, longitude, onLocationChange, address, autoSearch }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef(null);
  const lastSearchedRef = useRef("");

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  const searchLocation = useCallback(async (query, isAuto = false) => {
    if (!query || query.trim().length < 8 || query === lastSearchedRef.current) return;

    setIsSearching(true);
    lastSearchedRef.current = query;
    try {
      const response = await fetch(`${API}/geocode?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const nLat = parseFloat(lat);
        const nLon = parseFloat(lon);

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
      </div>

      <div className="relative rounded-lg overflow-hidden border border-slate-200" style={{ height: "280px" }}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${latitude},${longitude}&zoom=16`}
          allowFullScreen
          title="Ubicación Google Maps"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">
          <MapPin className="w-4 h-4 inline mr-1" />
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </span>
        <span className="text-xs text-[#52B788] font-medium">
          💡 Google Maps habilitado para máxima precisión
        </span>
      </div>
    </div>
  );
};

// Compress image to max 800x600 keeping aspect ratio, returns {dataUrl, isVertical}
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new window.Image();
      img.onload = () => {
        const MAX_W = 800;
        const MAX_H = 600;
        const isVertical = img.height > img.width; // portrait (phone vertical)
        let { width, height } = img;

        // Rotate constraints for vertical photos
        const maxW = isVertical ? MAX_H : MAX_W;
        const maxH = isVertical ? MAX_W : MAX_H;

        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ dataUrl, isVertical });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};

// Photo Upload Component
const PhotoUploader = ({ photos, onPhotosChange, facadeIndex, onFacadeChange, photoOrientations, onOrientationsChange, maxPhotos = 12 }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxPhotos - photos.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const { dataUrl, isVertical } = await compressImage(file);
        onPhotosChange((prev) => {
          if (prev.length >= maxPhotos) return prev;
          const newList = [...prev, dataUrl];
          if (newList.length === 1 && facadeIndex === null) {
            onFacadeChange(0);
          }
          return newList;
        });
        onOrientationsChange((prev) => [...prev, isVertical]);
      } catch {
        toast.error(`Error al procesar ${file.name}`);
      }
    }
  };

  const removePhoto = (index) => {
    onPhotosChange((prev) => {
      const newList = prev.filter((_, i) => i !== index);
      // Ajustar indice de fachada
      if (facadeIndex === index) {
        onFacadeChange(null);
      } else if (facadeIndex > index) {
        onFacadeChange(facadeIndex - 1);
      }
      return newList;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-semibold text-[#1B4332]">
            Fotografías ({photos.length}/{maxPhotos})
          </Label>
          <p className="text-[10px] text-slate-500">Máximo 12 imágenes. Selecciona una como "Fachada" para la portada.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= maxPhotos}
          className="border-[#52B788] text-[#52B788]"
          data-testid="upload-photos-btn"
        >
          <Upload className="w-4 h-4 mr-2" />
          Subir Fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {photos.map((photo, index) => {
          const isVert = photoOrientations && photoOrientations[index];
          return (
            <div key={index} className={`relative group rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow ${isVert ? 'aspect-[2/3]' : 'aspect-square'}`}>
              <img src={photo} alt={`Subida ${index}`} className="w-full h-full object-cover" />

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="self-end p-1 bg-white/20 hover:bg-red-500 text-white rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onFacadeChange(facadeIndex === index ? null : index)}
                  className={`w-full py-1.5 rounded text-[10px] font-bold uppercase transition-all duration-300 transform active:scale-95 ${facadeIndex === index
                    ? "bg-[#52B788] text-white shadow-lg"
                    : "bg-white/90 text-[#1B4332] hover:bg-white shadow-sm"
                    } ${facadeIndex === null ? 'animate-bounce' : ''}`}
                >
                  {facadeIndex === index ? "⭐ Fachada Principal" : "Elegir Portada"}
                </button>
              </div>

              {/* Indicator badge if facade */}
              {facadeIndex === index && (
                <div className="absolute top-1 left-1 bg-[#52B788] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  PORTADA
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        <ImageIcon className="w-3 h-3 inline mr-1" />
        Fotos de fachada, interiores y áreas comunes mejoran el reporte
      </p>

      {photos.length > 0 && facadeIndex === null && (
        <div className="bg-red-600 border-2 border-red-800 p-3 rounded-md animate-pulse flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3 text-white text-sm font-bold">
            <span className="text-xl">⚠️</span>
            <span>ATENCIÓN: Debe seleccionar una foto como <strong>"Fachada"</strong> para la portada del reporte.</span>
          </div>
          <div className="text-[10px] font-black text-white bg-red-800 px-2 py-1 rounded uppercase tracking-tighter">Obligatorio</div>
        </div>
      )}
    </div>
  );
};

const ValuationForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [includePhotos, setIncludePhotos] = useState(false);
  const [photoOrientations, setPhotoOrientations] = useState([]); // track vertical photos

  const [formData, setFormData] = useState({
    // Step 1 - Location
    state: "",
    municipality: "",
    neighborhood: "",
    street_address: "",
    internal_number: "",
    postal_code: "",
    latitude: 19.4326,
    longitude: -99.1332,

    // Step 2 - Property Details
    land_area: "",
    construction_area: "",
    land_regime: "",
    property_type: "Casa",
    land_use: "",
    surface_source: "",

    // Step 3 - Details
    bedrooms: "",
    bathrooms: "",
    parking_spots: "2",
    parking_covered: "",
    parking_uncovered: "",
    property_level: "PB",
    total_floors: "",
    estimated_age: "",
    conservation_state: "",
    construction_quality: "",
    frontage_type: "medianero", // NEW: tipo de frente
    special_features: [],
    other_features: "",

    // Photos (optional)
    photos: [],
    facade_photo_index: null
  });

  // Persistencia: Cargar desde localStorage al iniciar
  useEffect(() => {
    const savedData = localStorage.getItem("propvalu_draft");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Validar que el objeto tenga la estructura esperada
        if (parsed && typeof parsed === 'object') {
          setFormData(prev => ({ ...prev, ...parsed }));
          if (parsed.photos && parsed.photos.length > 0) setIncludePhotos(true);
        }
      } catch (e) {
        console.error("Error loading draft", e);
      }
    }
  }, []);

  // Persistencia: Guardar en localStorage al cambiar
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Siempre guardar sin fotos primero (para garantizar persistencia)
        const dataWithoutPhotos = { ...formData, photos: [] };
        localStorage.setItem("propvalu_draft", JSON.stringify(dataWithoutPhotos));
        // Intentar también guardar con fotos
        if (formData.photos && formData.photos.length > 0) {
          try {
            localStorage.setItem("propvalu_draft", JSON.stringify(formData));
          } catch {
            // Si las fotos son muy pesadas, dejar la versión sin fotos
          }
        }
      } catch (e) {
        console.warn("No se pudo guardar borrador:", e.message);
      }
    }, 500); // debounce 500ms
    return () => clearTimeout(timer);
  }, [formData]);


  const resetForm = () => {
    if (window.confirm("¿Está seguro de que desea borrar todos los datos del formulario? Esta acción no se puede deshacer.")) {
      const emptyState = {
        state: "",
        municipality: "",
        neighborhood: "",
        street_address: "",
        internal_number: "",
        postal_code: "",
        latitude: 19.4326,
        longitude: -99.1332,
        land_area: "",
        construction_area: "",
        land_regime: "URBANO",
        property_type: "Casa",
        land_use: "desconocido",
        surface_source: "Escrituras",
        bedrooms: "",
        bathrooms: "",
        parking_spots: "2",
        parking_covered: "",
        parking_uncovered: "",
        property_level: "PB",
        total_floors: "",
        estimated_age: "",
        conservation_state: "",
        construction_quality: "",
        frontage_type: "medianero",
        special_features: [],
        other_features: "",
        photos: [],
        facade_photo_index: null
      };
      setFormData(emptyState);
      setIncludePhotos(false);
      setPhotoOrientations([]);
      setCurrentStep(1);
      localStorage.removeItem("propvalu_draft");
      toast.success("Formulario reiniciado");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.log("Not authenticated");
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleFeatureToggle = (featureId) => {
    setFormData(prev => {
      const features = prev.special_features.includes(featureId)
        ? prev.special_features.filter(f => f !== featureId)
        : [...prev.special_features, featureId];
      return { ...prev, special_features: features };
    });
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.state || !formData.municipality || !formData.neighborhood) {
          toast.error("Por favor complete todos los campos de ubicación");
          return false;
        }
        return true;
      case 2:
        if (!formData.land_area || !formData.construction_area) {
          toast.error("Por favor ingrese las superficies del inmueble");
          return false;
        }
        if (parseFloat(formData.land_area) <= 0 || parseFloat(formData.construction_area) <= 0) {
          toast.error("Las superficies deben ser mayores a 0");
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const showFloorFields = ["Departamento", "Oficina", "Local comercial"].includes(formData.property_type);
  const isAppraiserMode = user && user.role === "appraiser";

  // Build address string for map auto-search (EXCLUDE internal_number to avoid geocoding errors)
  const buildAddressString = () => {
    const parts = [
      formData.street_address,
      formData.neighborhood,
      formData.postal_code,
      formData.municipality,
      formData.state
    ].filter(Boolean);
    return parts.join(", ");
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      // Extract service_room and laundry_room from special_features for backward compatibility
      const hasServiceRoom = formData.special_features.includes("service_room");
      const hasLaundryRoom = formData.special_features.includes("laundry_room");

      const payload = {
        state: formData.state,
        municipality: formData.municipality,
        neighborhood: formData.neighborhood,
        street_address: formData.street_address || null,
        postal_code: formData.postal_code || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        land_area: parseFloat(formData.land_area),
        construction_area: parseFloat(formData.construction_area),
        land_regime: formData.land_regime,
        property_type: formData.property_type,
        land_use: formData.land_use || null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        parking_spaces: formData.parking_spaces ? parseInt(formData.parking_spaces) : null,
        service_room: hasServiceRoom,
        laundry_room: hasLaundryRoom,
        floor_number: formData.floor_number ? parseInt(formData.floor_number) : null,
        total_floors: formData.total_floors ? parseInt(formData.total_floors) : null,
        estimated_age: formData.estimated_age ? parseInt(formData.estimated_age) : null,
        conservation_state: formData.conservation_state || null,
        construction_quality: formData.construction_quality || null,
        special_features: formData.special_features.length > 0 ? formData.special_features : null,
        other_features: formData.other_features || null,
        surface_source: formData.surface_source,
        facade_photo_index: formData.facade_photo_index,
        photos: includePhotos && formData.photos.length > 0 ? formData.photos : null
      };

      const createResponse = await fetch(`${API}/valuations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!createResponse.ok) {
        throw new Error("Error al crear la valuación");
      }

      const valuation = await createResponse.json();

      toast.success("Valuación creada. Buscando comparables...");

      const comparablesResponse = await fetch(`${API}/valuations/${valuation.valuation_id}/generate-comparables`, {
        method: "POST",
        credentials: "include"
      });

      if (!comparablesResponse.ok) {
        throw new Error("Error al generar comparables");
      }

      const compData = await comparablesResponse.json();
      toast.success(`Se encontraron ${compData.count} comparables`);

      // En modo valuador, ir a selección de comparables
      // En modo normal, calcular y mostrar reporte directamente
      if (isAppraiserMode) {
        navigate(`/comparables/${valuation.valuation_id}`);
      } else {
        const calcResponse = await fetch(`${API}/valuations/${valuation.valuation_id}/calculate`, {
          method: "POST",
          credentials: "include"
        });

        if (calcResponse.ok) {
          localStorage.removeItem("propvalu_draft"); // Limpiar borrador al éxito
          navigate(`/reporte/${valuation.valuation_id}`);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar la valuación");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Ubicación", icon: <MapPin className="w-5 h-5" /> },
    { number: 2, title: "Inmueble", icon: <Ruler className="w-5 h-5" /> },
    { number: 3, title: "Detalles", icon: <Home className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-[#1B4332] hover:bg-[#D9ED92]/30"
          data-testid="back-home-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#1B4332]" />
            <h1 className="font-['Outfit'] text-2xl md:text-3xl font-bold text-[#1B4332]">
              Nueva Valuación
            </h1>
            {isAppraiserMode && (
              <Badge className="bg-[#1B4332] text-white">Modo Valuador</Badge>
            )}
          </div>
        </div>
        <p className="text-slate-600">
          {isAppraiserMode
            ? "Complete los datos para seleccionar comparables manualmente"
            : "Complete los datos de su inmueble para obtener una estimación de valor"
          }
        </p>
      </div>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep >= step.number
                    ? "bg-[#1B4332] text-white"
                    : "bg-slate-200 text-slate-500"
                    }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`mt-2 text-sm font-medium ${currentStep >= step.number ? "text-[#1B4332]" : "text-slate-500"
                  }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${currentStep > step.number ? "bg-[#52B788]" : "bg-slate-200"
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <Card className="max-w-4xl mx-auto bg-white shadow-lg border-0">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="font-['Outfit'] text-xl text-[#1B4332] flex items-center gap-2">
              {steps[currentStep - 1].icon}
              {steps[currentStep - 1].title}
            </CardTitle>
            <Button
              onClick={resetForm}
              variant="ghost"
              size="sm"
              className="text-orange-600 hover:bg-orange-50 hover:text-orange-700 border border-orange-200"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Limpiar Datos
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Step 1 - Location */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Estado *
                  </Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => handleInputChange("state", value)}
                  >
                    <SelectTrigger data-testid="state-select" className="h-12">
                      <SelectValue placeholder="Seleccione estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEXICAN_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Municipio / Alcaldía *
                  </Label>
                  <Input
                    data-testid="municipality-input"
                    value={formData.municipality}
                    onChange={(e) => handleInputChange("municipality", e.target.value)}
                    placeholder="Ej: Benito Juárez"
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <Home className="w-4 h-4" /> Colonia *
                </Label>
                <Input
                  data-testid="neighborhood-input"
                  value={formData.neighborhood}
                  onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                  placeholder="Ej: Del Valle"
                  className="h-12"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-sm font-semibold text-[#1B4332]">Calle y Número Exterior *</Label>
                    <Input
                      data-testid="street-input"
                      value={formData.street_address}
                      onChange={(e) => handleInputChange("street_address", e.target.value)}
                      placeholder="Ej: Av. Vallarta 123"
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1B4332]">Interior</Label>
                    <Input
                      value={formData.internal_number}
                      onChange={(e) => handleInputChange("internal_number", e.target.value)}
                      placeholder="Ej: 402-A"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332]">Código Postal</Label>
                  <Input
                    data-testid="postal-input"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange("postal_code", e.target.value)}
                    placeholder="Ej: 03100"
                    className="h-12"
                  />
                </div>
              </div>

              {/* Map with auto-search */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <Map className="w-4 h-4" /> Ubicación en Mapa
                </Label>
                <LocationMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={handleLocationChange}
                  address={buildAddressString()}
                  autoSearch={formData.neighborhood && formData.municipality && formData.state}
                />
              </div>
            </div>
          )}

          {/* Step 2 - Property Details */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Tipo de Inmueble *
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PROPERTY_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleInputChange("property_type", type.value)}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${formData.property_type === type.value
                          ? "border-[#52B788] bg-[#D9ED92]/20"
                          : "border-slate-200 hover:border-[#52B788]/50"
                          }`}
                        data-testid={`type-${type.value}`}
                      >
                        <Icon className={`w-6 h-6 ${formData.property_type === type.value ? "text-[#1B4332]" : "text-slate-400"
                          }`} />
                        <span className={`text-sm font-medium ${formData.property_type === type.value ? "text-[#1B4332]" : "text-slate-600"
                          }`}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Ruler className="w-4 h-4" /> Superficie de Terreno (m²) *
                  </Label>
                  <Input
                    data-testid="land-area-input"
                    type="number"
                    value={formData.land_area}
                    onChange={(e) => handleInputChange("land_area", e.target.value)}
                    placeholder="Ej: 150"
                    className="h-12"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Building className="w-4 h-4" /> Superficie de Construcción (m²) *
                  </Label>
                  <Input
                    data-testid="construction-area-input"
                    type="number"
                    value={formData.construction_area}
                    onChange={(e) => handleInputChange("construction_area", e.target.value)}
                    placeholder="Ej: 200"
                    className="h-12"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Fuente de información de superficies *
                </Label>
                <Select
                  value={formData.surface_source}
                  onValueChange={(value) => handleInputChange("surface_source", value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccione la fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACE_SOURCES.map(source => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.surface_source === "Predial" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      <strong>Nota sobre el Predial:</strong> Los metros cuadrados registrados en el predial son datos administrativos que a menudo no coinciden con la realidad física del inmueble. Esta discrepancia puede afectar significativamente la precisión de la valuación.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Régimen de Suelo *
                  </Label>
                  <Select
                    value={formData.land_regime}
                    onValueChange={(value) => handleInputChange("land_regime", value)}
                  >
                    <SelectTrigger data-testid="land-regime-select" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LAND_REGIMES.map(regime => (
                        <SelectItem key={regime.value} value={regime.value}>
                          {regime.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Uso de suelo - Solo visible en modo valuador */}
                {isAppraiserMode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Uso de Suelo
                    </Label>
                    <Select
                      value={formData.land_use}
                      onValueChange={(value) => handleInputChange("land_use", value)}
                    >
                      <SelectTrigger data-testid="land-use-select" className="h-12">
                        <SelectValue placeholder="Seleccione uso de suelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {LAND_USE_TYPES.map(use => (
                          <SelectItem key={use.value} value={use.value}>
                            {use.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Consulte el visor urbano de su municipio
                    </p>
                  </div>
                )}
              </div>

              {formData.land_regime === "EJIDAL" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Nota:</strong> Los inmuebles con régimen {formData.land_regime.toLowerCase()}{" "}
                    tienen restricciones legales y menor liquidez.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 - Details */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-sm text-slate-500">
                Estos datos mejoran la precisión de la estimación
              </p>

              {/* Main details with icons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-[#52B788]" /> Recámaras
                  </Label>
                  <Input
                    data-testid="bedrooms-input"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange("bedrooms", e.target.value)}
                    placeholder="3"
                    className="h-12"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Bath className="w-4 h-4 text-[#52B788]" /> Baños
                  </Label>
                  <Input
                    data-testid="bathrooms-input"
                    type="number"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange("bathrooms", e.target.value)}
                    placeholder="2.5"
                    className="h-12"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#52B788]" /> Estac. Cubiertos
                  </Label>
                  <Input
                    type="number"
                    value={formData.parking_covered}
                    onChange={(e) => handleInputChange("parking_covered", e.target.value)}
                    placeholder="0"
                    className="h-12"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Car className="w-4 h-4 text-slate-400" /> Descubiertos
                  </Label>
                  <Input
                    type="number"
                    value={formData.parking_uncovered}
                    onChange={(e) => handleInputChange("parking_uncovered", e.target.value)}
                    placeholder="0"
                    className="h-12"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#52B788]" /> Antigüedad (años)
                  </Label>
                  <Input
                    data-testid="age-input"
                    type="number"
                    value={formData.estimated_age}
                    onChange={(e) => handleInputChange("estimated_age", e.target.value)}
                    placeholder="10"
                    className="h-12"
                    min="0"
                  />
                </div>


                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#52B788]" /> Piso de Ubicación
                  </Label>
                  <Select
                    value={formData.property_level}
                    onValueChange={(value) => handleInputChange("property_level", value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PB">Planta Baja</SelectItem>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(n => (
                        <SelectItem key={n} value={n.toString()}>Nivel {n}</SelectItem>
                      ))}
                      <SelectItem value="16+">Nivel 16+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#52B788]" /> Niveles Totales
                  </Label>
                  <Input
                    type="number"
                    value={formData.total_floors}
                    onChange={(e) => handleInputChange("total_floors", e.target.value)}
                    placeholder="2"
                    className="h-12"
                    min="1"
                  />
                </div>
              </div>

              {/* Quality and Conservation */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332]">Estado de Conservación</Label>
                  <Select
                    value={formData.conservation_state}
                    onValueChange={(value) => handleInputChange("conservation_state", value)}
                  >
                    <SelectTrigger data-testid="conservation-select" className={`h-12 ${!formData.conservation_state ? 'text-slate-400' : 'text-slate-900'}`}>
                      <SelectValue placeholder="▾ Seleccione estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSERVATION_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>
                          <span className={state.color}>{state.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332]">Calidad de Construcción</Label>
                  <Select
                    value={formData.construction_quality}
                    onValueChange={(value) => handleInputChange("construction_quality", value)}
                  >
                    <SelectTrigger data-testid="quality-select" className={`h-12 ${!formData.construction_quality ? 'text-slate-400' : 'text-slate-900'}`}>
                      <SelectValue placeholder="▾ Seleccione calidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRUCTION_QUALITIES.map(quality => (
                        <SelectItem key={quality.value} value={quality.value}>
                          {quality.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tipo de frente — campo INDAABIN con Select */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#52B788]" /> Tipo de Frente del Inmueble
                </Label>
                <Select
                  value={formData.frontage_type}
                  onValueChange={(value) => handleInputChange('frontage_type', value)}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Seleccione tipo de frente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medianero">▪ 1 Frente — Medianero (interior, sin ventaja de esquina)</SelectItem>
                    <SelectItem value="2_frentes">▣ 2 Frentes — Esquina (+5% ubicación)</SelectItem>
                    <SelectItem value="3_frentes">⬡ 3 Frentes (+10% ubicación)</SelectItem>
                    <SelectItem value="4_frentes">⬟ 4 Frentes — Manzana completa (+15% ubicación)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">Afecta el factor de ubicación en la homologación INDAABIN</p>
              </div>

              {/* Special Features - including service/laundry rooms */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[#1B4332]">Características Especiales</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SPECIAL_FEATURES.map(feature => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={feature.id}
                          data-testid={`feature-${feature.id}`}
                          checked={formData.special_features.includes(feature.id)}
                          onCheckedChange={() => handleFeatureToggle(feature.id)}
                        />
                        <label
                          htmlFor={feature.id}
                          className={`text-sm flex items-center gap-1 cursor-pointer transition-all ${formData.special_features.includes(feature.id)
                            ? "font-bold text-[#1B4332]"
                            : "text-slate-600"
                            }`}
                        >
                          <Icon className={`w-4 h-4 ${formData.special_features.includes(feature.id) ? "text-[#52B788]" : "text-slate-400"}`} />
                          {feature.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other Features - Free text field */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" /> Otros Elementos Importantes
                </Label>
                <Textarea
                  data-testid="other-features-input"
                  value={formData.other_features}
                  onChange={(e) => handleInputChange("other_features", e.target.value)}
                  placeholder="Ej: Vista panorámica, áreas de recreación, cuarto de máquinas, acabados de mármol, ventanales térmicos, etc."
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-slate-500">
                  Mencione cualquier característica adicional relevante para la valuación
                </p>
              </div>

              {/* Photos Toggle */}
              <div className="p-4 bg-[#D9ED92]/20 rounded-lg border border-[#D9ED92]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#1B4332]" />
                    <Label className="text-sm font-semibold text-[#1B4332]">
                      ¿Desea incluir fotografías en el reporte?
                    </Label>
                  </div>
                  <Switch
                    checked={includePhotos}
                    onCheckedChange={setIncludePhotos}
                    data-testid="include-photos-switch"
                  />
                </div>

                {includePhotos && (
                  <PhotoUploader
                    photos={formData.photos}
                    onPhotosChange={(updateFn) => {
                      if (typeof updateFn === 'function') {
                        setFormData(prev => ({ ...prev, photos: updateFn(prev.photos) }));
                      } else {
                        setFormData(prev => ({ ...prev, photos: updateFn }));
                      }
                    }}
                    facadeIndex={formData.facade_photo_index}
                    onFacadeChange={(idx) => handleInputChange("facade_photo_index", idx)}
                    photoOrientations={photoOrientations}
                    onOrientationsChange={setPhotoOrientations}
                    maxPhotos={12}
                  />
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
              data-testid="prev-step-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={nextStep}
                className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white"
                data-testid="next-step-btn"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-[#52B788] hover:bg-[#40916C] text-white px-8"
                data-testid="submit-valuation-btn"
              >
                {isLoading ? (
                  <>
                    <div className="spinner w-4 h-4 mr-2" />
                    Buscando comparables...
                  </>
                ) : (
                  <>
                    {isAppraiserMode ? "Buscar Comparables" : "Generar Valuación"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValuationForm;
