const fs = require('fs');
const fp = 'frontend/src/components/dashboard/tabs/PromocionesTab.jsx';
let content = fs.readFileSync(fp, 'utf8');

const target1 = const [temaSeleccionado, setTemaSeleccionado] = useState("classic");;

const replacement1 = const [temaSeleccionado, setTemaSeleccionado] = useState("classic");
  const [formatoSeleccionado, setFormatoSeleccionado] = useState("vertical_2p");
  const [amenidadesStr, setAmenidadesStr] = useState("Piscina Privada, Seguridad 24/7, Casa Club, Gimnasio");
  const [instalacionesStr, setInstalacionesStr] = useState("Paneles Solares, Cisterna 10,000L, Aire Acondicionado Central");
  const [espaciosStr, setEspaciosStr] = useState("Sala Principal, Comedor, Cocina Integral, Cuarto de Servicio, Family Room");;

content = content.replace(target1, replacement1);
fs.writeFileSync(fp, content, 'utf8');
console.log("Patched State variables");
