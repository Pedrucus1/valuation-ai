const fs = require('fs');
const fp = 'frontend/src/components/dashboard/tabs/promociones/LayoutClasico.jsx';
let content = fs.readFileSync(fp, 'utf8');

const target1 = import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2 } from "lucide-react";;
const rep1 = import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Plus, Fingerprint, Sofa, Home } from "lucide-react";;

content = content.replace(target1, rep1);
fs.writeFileSync(fp, content, 'utf8');
