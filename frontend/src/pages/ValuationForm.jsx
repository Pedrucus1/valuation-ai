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
  Info,
  CreditCard,
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
  { value: "Lujo", label: "Lujo" },
  { value: "Superior", label: "Superior" },
  { value: "Medio Alto", label: "Medio Alto" },
  { value: "Medio Medio", label: "Medio Medio" },
  { value: "Medio Bajo", label: "Medio Bajo" },
  { value: "Económico", label: "Económico" },
  { value: "Interés Social", label: "Interés Social" }
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

const STREET_TYPES = [
  { value: "peatonal", label: "Peatonal / Senda" },
  { value: "local", label: "Local (Calle común)" },
  { value: "barrial", label: "Barrial (Conexión entre colonias)" },
  { value: "distrital", label: "Distrital (Avenida)" },
  { value: "regional", label: "Regional (Carretera o Periférico)" }
];

const PAVEMENT_TYPES = [
  { value: "terraceria", label: "Terracería" },
  { value: "empedrado", label: "Empedrado" },
  { value: "adoquin", label: "Adoquín" },
  { value: "pavimento", label: "Pavimento (Asfalto)" },
  { value: "concreto", label: "Concreto Hidráulico" }
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

const ADS = [
  { tag: "Consejo PropValu", title: "El valor lo define la oferta y la demanda", body: "No existe un precio único para una propiedad. El valor real es el que un comprador informado está dispuesto a pagar en el mercado actual." },
  { tag: "¿Sabías que?", title: "El predial puede engañarte", body: "Las medidas del predial a menudo no coinciden con las escrituras. Siempre usa la superficie real de construcción de tus escrituras para una valuación más precisa." },
  { tag: "Dato de mercado", title: "La ubicación vale más que los metros", body: "Una propiedad 30% más pequeña en una zona premium puede superar en valor a una grande en zona periférica. La plusvalía de la colonia es clave." },
  { tag: "Consejo PropValu", title: "Las fotos importan al vender", body: "Las propiedades con fotografías profesionales reciben hasta 3 veces más contactos en portales. La primera impresión es digital." },
  { tag: "¿Sabías que?", title: "Nivel y orientación afectan el precio", body: "En edificios, los pisos altos con buena vista tienen un premium del 5-12%. La orientación al sur maximiza la iluminación natural." },
  { tag: "Dato de mercado", title: "Renta vs compra: cuándo conviene cada uno", body: "Si el precio de venta dividido entre la renta anual da más de 25 años, comprar puede ser menos eficiente que rentar e invertir la diferencia." },
  { tag: "Consejo PropValu", title: "Negocia con datos, no con intuición", body: "Conocer el precio por m² de los comparables activos en la zona te da ventaja real en cualquier negociación, ya seas comprador o vendedor." },
  { tag: "¿Sabías que?", title: "La antigüedad deprecia el valor físico", body: "Una construcción pierde en promedio 2% de valor físico por año. Por eso las remodelaciones recientes son uno de los factores que más incrementan el avalúo." },
  { tag: "Dato de mercado", title: "El cap rate revela la rentabilidad real", body: "Un cap rate del 5-7% anual es saludable en México. Propiedades con cap rate menor al 4% suelen estar sobrevaloradas para inversión de renta." },
  { tag: "Consejo PropValu", title: "Comparables: calidad sobre cantidad", body: "5 comparables bien seleccionados (mismo tipo, misma zona, mismos m²) son más precisos que 20 mal filtrados. La homologación hace la diferencia." },
  { tag: "Dato de mercado", title: "La escrituración protege tu inversión", body: "En México, más del 30% de las transacciones inmobiliarias tienen problemas legales por falta de escrituras actualizadas. Escriturar a tiempo evita litigios costosos." },
  { tag: "Consejo PropValu", title: "El tiempo en el mercado sube el riesgo", body: "Una propiedad con más de 90 días publicada sin venderse pierde poder de negociación. El precio correcto desde el inicio reduce el tiempo de venta a la mitad." },
  { tag: "¿Sabías que?", title: "El estacionamiento puede valer más de lo que crees", body: "En zonas urbanas densas de Guadalajara o CDMX, un cajón de estacionamiento adicional puede incrementar el valor de un departamento entre 8% y 15%." },
  { tag: "Dato de mercado", title: "La inflación y el ladrillo van de la mano", body: "Históricamente, el sector inmobiliario mexicano ha superado la inflación en un 2-3% anual en zonas consolidadas. Es uno de los activos más estables a largo plazo." },
  { tag: "Consejo PropValu", title: "Superficie vendible vs superficie total", body: "En condominios, la superficie privativa (la tuya) es la que se valúa. Las áreas comunes no se suman al precio del m² — un error frecuente al comparar propiedades." },
  { tag: "¿Sabías que?", title: "Las amenidades tienen rendimiento decreciente", body: "La primera alberca en un desarrollo suma valor. La segunda no. Pagar extra por amenidades que ya existen en el edificio de enfrente no se recupera al vender." },
  { tag: "Dato de mercado", title: "Plusvalía esperada vs plusvalía real", body: "No toda zona 'en crecimiento' genera plusvalía automática. La infraestructura vial, escuelas, comercio y seguridad son los indicadores reales que mueven los precios." },
  { tag: "Consejo PropValu", title: "El CUS: clave para terrenos y desarrollos", body: "El Coeficiente de Utilización del Suelo determina cuánto puedes construir legalmente. Un terreno con CUS alto en zona de demanda puede triplicar su valor potencial." },
  { tag: "¿Sabías que?", title: "Remodelar no siempre recupera la inversión", body: "Una remodelación premium en una colonia de nivel medio raramente se recupera al vender. El valor máximo de una propiedad lo pone el techo de su zona, no sus acabados." },
  { tag: "Dato de mercado", title: "El mercado de usados mueve más que el nuevo", body: "En México, el 70% de las transacciones inmobiliarias son de vivienda usada. Conocer el precio real del mercado secundario es más útil que compararse con desarrollos nuevos." },
];

/* ─── Checkout constants ──────────────────────────────── */

const CHECKOUT_PLANS = [
  { id: "individual", label: "Individual", qty: 1,  price: 280,  tag: null,           popular: false },
  { id: "bronce",     label: "Bronce",     qty: 3,  price: 815,  tag: "-3%",          popular: false },
  { id: "plata",      label: "Plata",      qty: 5,  price: 1317, tag: "Más popular",  popular: true  },
  { id: "oro",        label: "Oro",        qty: 10, price: 2555, tag: "Mejor precio", popular: false },
];

const CHECKOUT_ADDONS = [
  { id: "valuador", emoji: "🏅", title: "Revisión por Valuador Certificado", desc: "Valuador CNBV/INDAABIN revisa y firma. Entrega 48h.", price: 350 },
  { id: "visita",   emoji: "📐", title: "Verificación de m² en sitio",        desc: "Visita física para confirmar metros reales.",       price: 600 },
];

const fmtMXN = (v) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(v);

const fmtCardNum = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExpiry  = (v) => v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

/* ──────────────────────────────────────────────────────── */

const ValuationForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [infoDismissed, setInfoDismissed] = useState(() =>
    !!localStorage.getItem("propvalu_info_dismissed")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [adProgress, setAdProgress] = useState(0);
  const [user, setUser] = useState(null);
  const [includePhotos, setIncludePhotos] = useState(false);

  // Checkout step state (step 4, only for public users)
  const [checkoutPlan, setCheckoutPlan] = useState(CHECKOUT_PLANS[0]);
  const [checkoutAddons, setCheckoutAddons] = useState([]);
  const [checkoutCard, setCheckoutCard] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [photoOrientations, setPhotoOrientations] = useState([]); // track vertical photos
  const [resetKey, setResetKey] = useState(0); // For forcing UI reset

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
    frontage_type: "", // NEW: tipo de frente
    special_features: [],
    other_features: "",

    // Photos (optional)
    photos: [],
    facade_photo_index: null,

    // NEW: Contexto de calle y vialidad
    street_type: "",
    pavement_type: ""
  });

  // Limpiar carrito anterior para que checkout siempre aparezca en cada nueva valuación
  useEffect(() => {
    sessionStorage.removeItem("propvalu_cart");
  }, []);

  // Pre-seleccionar plan si viene de PricingPage (plan individual)
  useEffect(() => {
    const pre = sessionStorage.getItem("propvalu_preselected_plan");
    if (pre) {
      try {
        const { planId, addons: preAddons } = JSON.parse(pre);
        const found = CHECKOUT_PLANS.find(p => p.id === planId);
        if (found) setCheckoutPlan(found);
        if (preAddons?.length) setCheckoutAddons(preAddons);
      } catch {}
      sessionStorage.removeItem("propvalu_preselected_plan");
    }
  }, []);

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
        land_regime: "",
        property_type: "Casa",
        land_use: "",
        surface_source: "",
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
        frontage_type: "",
        special_features: [],
        other_features: "",
        photos: [],
        facade_photo_index: null,
        street_type: "",
        pavement_type: ""
      };
      setFormData(emptyState);
      setIncludePhotos(false);
      setPhotoOrientations([]);
      setCurrentStep(1);
      localStorage.removeItem("propvalu_draft");
      setResetKey(prev => prev + 1); // FORCE REACT TO UNMOUNT & REMOUNT THE FORM
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
        // Ignorar respuestas del stub viejo (sin user_id real)
        if (userData?.user_id && userData.user_id !== 'user_local_dev') {
          setUser(userData);
        }
      }
    } catch (error) {
      // No autenticado — usuario público
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Lógica de auto-sugerencia de Uso de Suelo
      if (field === "property_type" || field === "construction_quality") {
        const type = newData.property_type;
        const quality = newData.construction_quality;
        
        let suggestedUse = prev.land_use;
        
        if (type === "Comercio" || type === "Local comercial") {
          suggestedUse = "comercial";
        } else if (type === "Oficina") {
          suggestedUse = "oficinas";
        } else if (type === "Departamento") {
          suggestedUse = "h_vertical";
        } else if (type === "Casa" || type === "Casa en condominio") {
          if (quality === "Interés Social" || quality === "Económico") {
            suggestedUse = "h_popular";
          } else {
            suggestedUse = "h_habitacional";
          }
        }
        newData.land_use = suggestedUse;
      }
      
      return newData;
    });
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
      case 2: {
        const noTerreno = ["Departamento", "Oficina", "Local comercial"].includes(formData.property_type);
        if (!formData.construction_area) {
          toast.error("Por favor ingrese la superficie de construcción");
          return false;
        }
        if (!noTerreno && !formData.land_area) {
          toast.error("Por favor ingrese la superficie de terreno");
          return false;
        }
        if (parseFloat(formData.construction_area) <= 0) {
          toast.error("La superficie de construcción debe ser mayor a 0");
          return false;
        }
        return true;
      }
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const maxStep = skipCheckout ? 3 : 4;
      const next = Math.min(currentStep + 1, maxStep);
      // If going to checkout step but user already has a paid cart, skip to analysis
      if (next === 4 && sessionStorage.getItem("propvalu_cart")) {
        handleSubmit();
        return;
      }
      setCurrentStep(next);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const showFloorFields = ["Departamento", "Oficina", "Local comercial"].includes(formData.property_type);
  const isAppraiserMode = user && user.role === "appraiser";
  // Usuarios con plan comprado (valuador, inmobiliaria, admin) no ven el paso de pago
  const skipCheckout = !!(user && ["appraiser", "realtor", "super_admin"].includes(user.role));
  const showAds = !user || (
    user.role !== "appraiser" &&
    user.role !== "super_admin" &&
    !(user.role === "realtor" && user.plan === "premier")
  );

  // Slide timer for ad popup during submission (6s per slide = 60s total)
  useEffect(() => {
    if (!isLoading || !showAds) return;
    const SLIDE_MS = 12000;
    const TICK_MS = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += TICK_MS;
      const withinSlide = elapsed % SLIDE_MS;
      setAdProgress(Math.round((withinSlide / SLIDE_MS) * 100));
      if (withinSlide === 0) setAdIndex(i => (i + 1) % ADS.length);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [isLoading, showAds]);

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
    const submitStart = Date.now();
    // Mínimo de tiempo que el popup de ads debe mostrarse (45-60s aleatorio)
    const MIN_AD_MS = 45000 + Math.random() * 15000;

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
        construction_area: parseFloat(formData.construction_area),
        land_area: parseFloat(formData.land_area) || parseFloat(formData.construction_area),
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

      // Esperar el tiempo mínimo de ads antes de navegar
      const elapsed = Date.now() - submitStart;
      const remaining = MIN_AD_MS - elapsed;
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));

      navigate(`/comparables/${valuation.valuation_id}`);

    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar la valuación");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Ubicación", icon: <MapPin className="w-5 h-5" /> },
    { number: 2, title: "Inmueble",  icon: <Ruler className="w-5 h-5" /> },
    { number: 3, title: "Detalles",  icon: <Home className="w-5 h-5" /> },
    ...(!skipCheckout ? [{ number: 4, title: "Pago", icon: <CreditCard className="w-5 h-5" /> }] : []),
  ];

  const ad = ADS[adIndex];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">

      {/* Ad popup bloqueante durante la generación de valuación (solo público/inmobiliaria no-Premier) */}
      {isLoading && showAds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div className="bg-[#1B4332] rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center justify-between p-8"
               style={{ width: "min(90vw, 520px)", height: "min(90vw, 520px)" }}>
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#D9ED92]" />
                <span className="font-['Outfit'] text-lg font-bold text-white">
                  Prop<span className="text-[#52B788]">Valu</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[#52B788] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60 text-xs">Generando tu valuación...</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
              <p className="text-[10px] font-bold text-[#D9ED92] uppercase tracking-widest mb-3">{ad.tag}</p>
              <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug">{ad.title}</h2>
              <p className="text-white/80 text-base leading-relaxed max-w-xs">{ad.body}</p>
            </div>
            <div className="w-full flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {ADS.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all duration-300 ${
                    i === adIndex ? "w-5 h-2 bg-[#D9ED92]" : i < adIndex ? "w-2 h-2 bg-[#52B788]" : "w-2 h-2 bg-white/20"
                  }`} />
                ))}
              </div>
              <p className="text-white/25 text-[10px] mt-1">
                {Math.max(1, Math.ceil((100 - adProgress) / 100 * 12))}s · Estimación con inteligencia de PropValu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header: título + stepper */}
      <div className="sticky top-0 z-40 bg-[#1B4332] shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-white/70 hover:text-white transition-colors flex-shrink-0 p-1 rounded hover:bg-white/10"
            data-testid="back-home-btn"
            title="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <Building2 className="w-5 h-5 text-white flex-shrink-0" />
            <h1 className="font-['Outfit'] text-base font-bold text-white hidden sm:block">Nueva Valuación</h1>
            {isAppraiserMode && (
              <Badge className="bg-white/20 text-white text-xs border-0 px-2 hidden sm:inline-flex">Modo Valuador</Badge>
            )}
          </div>
          <div className="flex-1 flex justify-end items-center">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center mx-1.5 sm:mx-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.number
                      ? "bg-[#52B788] text-white"
                      : currentStep === step.number
                        ? "bg-white text-[#1B4332] ring-2 ring-[#D9ED92] shadow-md"
                        : "bg-white/20 text-white/60"
                  }`}>
                    {currentStep > step.number ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                  </div>
                  <span className={`mt-1 text-xs hidden sm:block ${
                    currentStep > step.number ? "text-white/80 font-medium" :
                    currentStep === step.number ? "text-white font-bold" :
                    "text-white/50 font-medium"
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-4 sm:w-10 h-0.5 ${currentStep > step.number ? "bg-[#52B788]" : "bg-white/25"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal informativo para Público General */}
      {!infoDismissed && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}>
          <div className="bg-[#1B4332] rounded-2xl shadow-2xl w-full max-w-lg p-7">
            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-[#D9ED92] flex items-center justify-center flex-shrink-0">
                <Info className="w-6 h-6 text-[#1B4332]" />
              </div>
              <h3 className="font-['Outfit'] font-bold text-white text-xl leading-snug">
                Antes de comenzar —<br className="hidden sm:block" /> ¿Qué datos vas a necesitar?
              </h3>
            </div>

            {/* Lista */}
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-white/90 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="text-[#D9ED92] text-base mt-0.5">📍</span>
                <span><strong className="text-white">Dirección completa</strong>: calle, número exterior e interior (si tiene), colonia, municipio y estado.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[#D9ED92] text-base mt-0.5">📐</span>
                <span><strong className="text-white">Superficie de terreno y construcción</strong>: idealmente de escritura o planos.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[#D9ED92] text-base mt-0.5">🏠</span>
                <span><strong className="text-white">Tipo de propiedad</strong>: casa, departamento, terreno, local, etc.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[#D9ED92] text-base mt-0.5">📋</span>
                <span><strong className="text-white">Características</strong>: recámaras, baños, estacionamiento, nivel y antigüedad.</span>
              </div>
              <div className="flex items-start gap-2.5 sm:col-span-2 pt-3 border-t border-white/20">
                <span className="text-[#D9ED92] text-base mt-0.5">⚠️</span>
                <span><strong className="text-white">Nota:</strong> Esta es una <em>estimación orientativa</em> basada en comparables. No sustituye un avalúo oficial con validez legal.</span>
              </div>
            </div>

            {/* Botón OK */}
            <button
              onClick={() => {
                setInfoDismissed(true);
                localStorage.setItem("propvalu_info_dismissed", "1");
              }}
              className="w-full bg-[#D9ED92] hover:bg-[#c8e070] text-[#1B4332] font-bold text-base py-3 rounded-xl transition-colors"
            >
              Entendido, comenzar
            </button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
      <Card className="max-w-4xl mx-auto bg-white shadow-lg border-0 overflow-hidden">
        <CardHeader className="bg-[#1B4332] py-3 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="font-['Outfit'] text-base text-white flex items-center gap-2">
              {steps[currentStep - 1].icon}
              {steps[currentStep - 1].title}
            </CardTitle>
            {currentStep < 4 && (
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:bg-white/10 hover:text-white border border-white/30"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Limpiar Datos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent key={resetKey} className="p-6">
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

              {/* NEW: Contexto de Calle */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332]">Tipo de Calle / Vialidad</Label>
                  <Select
                    value={formData.street_type || undefined}
                    onValueChange={(value) => handleInputChange("street_type", value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccione tipo de calle" />
                    </SelectTrigger>
                    <SelectContent>
                      {STREET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1B4332]">Tipo de Pavimento</Label>
                  <Select
                    value={formData.pavement_type || undefined}
                    onValueChange={(value) => handleInputChange("pavement_type", value)}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccione tipo de pavimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAVEMENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Map with auto-search */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <Map className="w-4 h-4" /> Ubicación en Mapa
                </Label>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#52B788]" />
                  Verifica que el pin esté sobre tu propiedad. Si no, escribe la dirección en el buscador o arrástralo manualmente.
                </p>
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
                        className={`py-2 px-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${formData.property_type === type.value
                          ? "border-[#52B788] bg-[#D9ED92]/20"
                          : "border-slate-200 hover:border-[#52B788]/50"
                          }`}
                        data-testid={`type-${type.value}`}
                      >
                        <Icon className={`w-5 h-5 ${formData.property_type === type.value ? "text-[#1B4332]" : "text-slate-400"
                          }`} />
                        <span className={`text-xs font-medium ${formData.property_type === type.value ? "text-[#1B4332]" : "text-slate-600"
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
                    <Ruler className="w-4 h-4" /> Superficie de Terreno (m²)
                    {["Departamento", "Oficina", "Local comercial"].includes(formData.property_type) && (
                      <span className="text-xs font-normal text-slate-400">(opcional)</span>
                    )}
                  </Label>
                  <Input
                    data-testid="land-area-input"
                    type="number"
                    value={formData.land_area}
                    onChange={(e) => handleInputChange("land_area", e.target.value)}
                    placeholder={["Departamento", "Oficina", "Local comercial"].includes(formData.property_type) ? `Igual a construcción (${formData.construction_area || "m²"})` : "Ej: 150"}
                    className="h-12"
                    min="1"
                  />
                  {["Departamento", "Oficina", "Local comercial"].includes(formData.property_type) && !formData.land_area && formData.construction_area && (
                    <p className="text-xs text-slate-400">Si se omite, se usará {formData.construction_area} m² (igual a construcción)</p>
                  )}
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
                  value={formData.surface_source || undefined}
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
                    value={formData.land_regime || undefined}
                    onValueChange={(value) => handleInputChange("land_regime", value)}
                  >
                    <SelectTrigger data-testid="land-regime-select" className="h-12">
                      <SelectValue placeholder="Seleccione régimen" />
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

                {/* Uso de suelo - Solo visible para valuadores (público no lo conoce) */}
                {isAppraiserMode && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Uso de Suelo
                    </Label>
                    <Select
                      value={formData.land_use || undefined}
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
            <div className="animate-fade-in">
              <p className="text-sm text-slate-500 mb-4">
                Estos datos mejoran la precisión de la estimación
              </p>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-0 items-end">
              {/* ── COLUMNA IZQUIERDA ── */}
              <div className="flex flex-col gap-4">

              {/* Main details with icons */}
              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-3 gap-3 items-end">
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
              <div className="grid grid-cols-2 gap-3">
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

              {/* Tipo de frente — al final de columna izquierda */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#1B4332] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#52B788]" /> Tipo de Frente del Inmueble
                </Label>
                <Select
                  value={formData.frontage_type || undefined}
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

              </div>{/* fin columna izquierda */}

              {/* ── COLUMNA DERECHA ── */}
              <div className="flex flex-col gap-4">

              {/* Special Features - including service/laundry rooms */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-[#1B4332]">Características Especiales</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
                  {SPECIAL_FEATURES.map(feature => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.id} className="flex items-center gap-2 min-w-0 py-0.5">
                        <Checkbox
                          id={feature.id}
                          data-testid={`feature-${feature.id}`}
                          checked={formData.special_features.includes(feature.id)}
                          onCheckedChange={() => handleFeatureToggle(feature.id)}
                          className="flex-shrink-0"
                        />
                        <label
                          htmlFor={feature.id}
                          className={`text-sm flex items-center gap-1.5 cursor-pointer transition-all min-w-0 ${formData.special_features.includes(feature.id)
                            ? "font-bold text-[#1B4332]"
                            : "text-slate-600"
                            }`}
                        >
                          <Icon className={`w-4 h-4 flex-shrink-0 ${formData.special_features.includes(feature.id) ? "text-[#52B788]" : "text-slate-400"}`} />
                          <span className="truncate">{feature.label}</span>
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
                  placeholder="Ej: Vista panorámica, áreas de recreación, acabados de mármol, ventanales térmicos, etc."
                  className="min-h-[80px] resize-none"
                />
              </div>

              </div>{/* fin columna derecha */}
              </div>{/* fin grid 2 cols */}

              {/* Photos Toggle — ancho completo */}
              <div className="mt-4 p-4 bg-[#D9ED92]/20 rounded-lg border border-[#D9ED92]">
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

          {/* Step 4 — Checkout (public users only) */}
          {currentStep === 4 && !skipCheckout && (() => {
            const addonsTotal = checkoutAddons.reduce((s, id) => {
              const a = CHECKOUT_ADDONS.find(x => x.id === id);
              return s + (a ? a.price * checkoutPlan.qty : 0);
            }, 0);
            const subtotal = checkoutPlan.price + addonsTotal;
            const total = subtotal * 1.16;
            const cardOk = checkoutCard.number.replace(/\s/g, "").length === 16
              && checkoutCard.expiry.length === 5
              && checkoutCard.cvv.length >= 3
              && checkoutCard.name.trim().length >= 3;

            const handlePayAndAnalyze = async () => {
              setCheckoutLoading(true);
              await new Promise(r => setTimeout(r, 2000));
              setCheckoutLoading(false);
              sessionStorage.setItem("propvalu_cart", JSON.stringify({
                qty: checkoutPlan.qty, addons: checkoutAddons, total: subtotal,
              }));
              handleSubmit();
            };

            return (
              <div className="space-y-6 animate-fade-in">
                <p className="text-sm text-slate-500 -mt-2">
                  Selecciona tu plan y completa el pago para iniciar el análisis con IA.
                </p>

                {/* Plan selector */}
                <div>
                  <p className="text-sm font-semibold text-[#1B4332] mb-3">Plan</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CHECKOUT_PLANS.map(plan => {
                      const active = checkoutPlan.id === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setCheckoutPlan(plan)}
                          className={`relative rounded-xl border-2 p-3.5 text-left transition-all ${
                            active ? "border-[#52B788] bg-[#D9ED92]/10" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {plan.tag && (
                            <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              plan.popular ? "bg-[#D9ED92] text-[#1B4332]" : "bg-slate-200 text-slate-500"
                            }`}>
                              {plan.tag}
                            </span>
                          )}
                          <p className={`font-bold text-sm ${active ? "text-[#1B4332]" : "text-slate-700"}`}>{plan.label}</p>
                          <p className="text-xs text-slate-400">{plan.qty} valuación{plan.qty > 1 ? "es" : ""}</p>
                          <p className={`text-base font-bold mt-1 ${active ? "text-[#1B4332]" : "text-slate-600"}`}>{fmtMXN(plan.price)}</p>
                          <p className="text-[10px] text-slate-400">+ IVA</p>
                        </button>
                      );
                    })}
                  </div>
                  {checkoutPlan.qty > 1 && (
                    <p className="text-xs text-[#52B788] font-medium mt-2">
                      Valuaciones no usadas vigentes 3 meses
                    </p>
                  )}
                </div>

                {/* Add-ons */}
                <div>
                  <p className="text-sm font-semibold text-[#1B4332] mb-2">¿Mayor precisión? <span className="font-normal text-slate-400">(opcional)</span></p>
                  <div className="space-y-2">
                    {CHECKOUT_ADDONS.map(addon => {
                      const active = checkoutAddons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => setCheckoutAddons(p =>
                            p.includes(addon.id) ? p.filter(x => x !== addon.id) : [...p, addon.id]
                          )}
                          className={`w-full rounded-xl border-2 p-3 text-left flex items-center gap-3 transition-all ${
                            active ? "border-[#52B788] bg-[#D9ED92]/10" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className="text-xl shrink-0">{addon.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1B4332]">{addon.title}</p>
                            <p className="text-xs text-slate-400">{addon.desc}</p>
                          </div>
                          <span className="text-sm font-bold text-[#1B4332] shrink-0">
                            +{fmtMXN(addon.price * checkoutPlan.qty)}
                          </span>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            active ? "bg-[#52B788] border-[#52B788]" : "border-slate-300"
                          }`}>
                            {active && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price summary */}
                <div className="bg-[#F8F9FA] rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Plan {checkoutPlan.label} ({checkoutPlan.qty} valuación{checkoutPlan.qty > 1 ? "es" : ""})</span>
                    <span>{fmtMXN(checkoutPlan.price)}</span>
                  </div>
                  {checkoutAddons.map(id => {
                    const a = CHECKOUT_ADDONS.find(x => x.id === id);
                    return a ? (
                      <div key={id} className="flex justify-between text-slate-400 text-xs">
                        <span>{a.emoji} {a.title}</span>
                        <span>+{fmtMXN(a.price * checkoutPlan.qty)}</span>
                      </div>
                    ) : null;
                  })}
                  <div className="flex justify-between text-slate-400 text-xs pt-1 border-t border-slate-200">
                    <span>IVA (16%)</span>
                    <span>{fmtMXN(subtotal * 0.16)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1B4332] text-base pt-1">
                    <span>Total</span>
                    <span>{fmtMXN(total)}</span>
                  </div>
                </div>

                {/* Card fields */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#1B4332]">Datos de pago <span className="text-xs text-slate-400 font-normal">(simulado)</span></p>
                  <input
                    className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788] font-mono tracking-wider"
                    placeholder="Número de tarjeta   4242 4242 4242 4242"
                    value={checkoutCard.number}
                    maxLength={19}
                    onChange={e => setCheckoutCard(p => ({ ...p, number: fmtCardNum(e.target.value) }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788]"
                      placeholder="MM/AA"
                      value={checkoutCard.expiry}
                      maxLength={5}
                      onChange={e => setCheckoutCard(p => ({ ...p, expiry: fmtExpiry(e.target.value) }))}
                    />
                    <input
                      className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788]"
                      placeholder="CVV"
                      value={checkoutCard.cvv}
                      maxLength={4}
                      onChange={e => setCheckoutCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    />
                  </div>
                  <input
                    className="w-full border border-[#B7E4C7] rounded-lg bg-[#F0FAF5] px-3 py-2.5 text-sm focus:outline-none focus:border-[#52B788] uppercase"
                    placeholder="NOMBRE EN LA TARJETA"
                    value={checkoutCard.name}
                    onChange={e => setCheckoutCard(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    className="border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332] hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atrás
                  </Button>
                  <Button
                    onClick={handlePayAndAnalyze}
                    disabled={checkoutLoading || isLoading || !cardOk}
                    className="flex-1 bg-[#52B788] hover:bg-[#40916C] text-white font-bold"
                    data-testid="submit-valuation-btn"
                  >
                    {checkoutLoading || isLoading ? (
                      <><div className="spinner w-4 h-4 mr-2" />{checkoutLoading ? "Procesando pago…" : "Generando valuación…"}</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" />Pagar {fmtMXN(total)} e iniciar análisis</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
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
              ) : skipCheckout ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-[#52B788] hover:bg-[#40916C] text-white px-8"
                  data-testid="submit-valuation-btn"
                >
                  {isLoading ? (
                    <><div className="spinner w-4 h-4 mr-2" />Buscando comparables...</>
                  ) : (
                    <>Iniciar Análisis<ChevronRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  className="bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-8"
                  data-testid="next-step-btn"
                >
                  Continuar al pago
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default ValuationForm;



