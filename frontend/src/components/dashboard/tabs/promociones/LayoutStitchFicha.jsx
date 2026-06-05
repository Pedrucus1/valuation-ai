import React from 'react';
import { MapPin, Building, Map, Phone, Mail, User, CheckCircle2, Waves, Wind, Car, Camera, Trees, Dumbbell, Shield, Wine, Monitor, Plus, Fingerprint, Sofa, Home } from "lucide-react";

const LayoutStitchFicha = ({ fichaAvaluo, session, formatMXN, parseFeatureItem, amenidades }) => {
  return (
    <div className="bg-white w-[2560px] h-[2432px] overflow-hidden relative" style={{ transform: 'scale(0.35)', transformOrigin: 'top left' }}>
      

<div className="no-print mb-8 w-full max-w-[8.5in] flex justify-end">
<button className="bg-primary text-on-primary px-8 py-3 font-label-md uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity" onclick="window.print()">
<span className="material-symbols-outlined">print</span>
            Print Spec Sheet
        </button>
</div>

<main className="print-container bg-surface shadow-2xl overflow-hidden flex flex-col px-[0.6in] py-[0.6in] border border-outline-variant relative">

<header className="flex justify-between items-baseline border-b border-outline-variant pb-5 mb-6">
<div>
<h1 className="font-headline-xl text-[36px] text-primary tracking-tight leading-none">THE OBSIDIAN VILLA</h1>
<p className="font-label-md text-label-md text-on-surface-variant flex items-center gap-1 mt-1">
<span className="material-symbols-outlined text-[16px]">location_on</span>
                    127 AZURE CREST, MALIBU
                </p>
</div>
<div className="text-right">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase block tracking-wider">Reference No.</span>
<span className="font-label-md text-label-md font-bold">OV-2024-001</span>
</div>
</header>

<section className="mb-6">
<div className="w-full overflow-hidden grayscale-[0.2] h-14">
<img alt="Main Hero Exterior" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLtgeVoYIPP5RiSr_k4xUWB8rnx0FmmWFBwGLOO9-Q7oWSoEYCcY__cU2JEZWR-Rbj-VlEQjVLoCrpn8u6J466mdGtL8ipOMb0s9F2NfAWegrNPcPlJnokWK0Lnp-Hud1Zpacqho6dUGHfO1eG-AGuReXBygT9o2xOij8mBgi5135xo2UCcZ2pTQMpu3y9VcQ-xKgoCXeLOhtZUYzMJKgKwXMUF-7ZrhHO7pQIOFS98Mnbc1-2dQY20F_Pg"/ />
</div>
</section>

<section className="mb-6">

<div className="border-b border-t border-outline-variant py-3 mb-6">
<div className="flex justify-between items-center">
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">List Price</span>
<span className="font-headline-md text-[20px] text-secondary">$2,500,000</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Built Area</span>
<span className="font-body-md text-body-md font-bold">850m²</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Land Size</span>
<span className="font-body-md text-body-md font-bold">1,200m²</span>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Suites</span>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-[16px]">bed</span>
<span className="font-body-md text-body-md font-bold">5</span>
</div>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Baths</span>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-[16px]">bathtub</span>
<span className="font-body-md text-body-md font-bold">6</span>
</div>
</div>
<div className="flex flex-col">
<span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">Parking</span>
<div className="flex items-center gap-1">
<span className="material-symbols-outlined text-primary text-[16px]">directions_car</span>
<span className="font-body-md text-body-md font-bold">4</span>
</div>
</div>
</div>
</div>

<div className="max-w-3xl">
<h2 className="font-label-sm text-[10px] text-on-surface-variant uppercase mb-2 tracking-widest">Architectural Narrative</h2>
<p className="font-body-md text-[16px] text-on-surface leading-tight italic border-l-4 border-secondary pl-6 py-1 mb-3">
            An uncompromising statement of modern geometry and material honesty. The Obsidian Villa merges tectonic precision with the natural fluidity of the Malibu coastline.
        </p>
<p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
            Designed with an emphasis on atmospheric clarity, the residence features monochromatic tones of basalt and glass. Large-scale volumes open seamlessly to the horizon, where the infinity pool serves as a direct visual extension of the Pacific.
        </p>
</div>
</section>

<section className="flex-grow mt-6">
<h2 className="font-label-sm text-[10px] text-on-surface-variant uppercase mb-3 tracking-widest">Internal Perspectives</h2>
<div className="grid grid-cols-3 gap-3">
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Luxury Kitchen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLv4RZL72W3feG3hboYo8-kDucut_giPsyxxuOAUBivSQhWmK9yZpg9tHLn6M3JhTUsZFHGiE_A4DnUJkASs5NSmqcYd-IJY5pgQICHkXsd81Xf44uPZCW1d1OoqTOXJUWXmsPgtlXbZO5Vv1nb-3UALLCh0WXCaDu4XOdh7Bxi9TIH7IdE9gBEUguB1ZqgKBctUGnQjgHEbGblhOINsMtc8zGA0qjtUCbTDvfW4TYef9uq0CzehlBgEOS0"/ />
</div>
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Living Space" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLtpR4_F8gt0W4sZ7qORkPxaMdWzVe2HYgoDir3Ox6sO6a69Oo43J_n9VSyyfRIYERz3Fl1NzaYWEczbBSMTgnigdkdcCJKuuBFAuK1x8GXqfbsrjSt2SRdKNznGUN3lvuhocqDPTbLuPEcB2KvWu1efeR3xwEsH-fcYAXKVwrKg-RSJsFh5V5-jJt_H1btIl8ua6QQLq6EpL1Pah-B3taughQAnyOD-0QuA566lEClYqG4OzkpGoaJUvX4v"/ />
</div>
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Master Bedroom" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLv1s9iPzEnm5jwTrHtLSnpY_D-01UaMbQ56gXAR0_iIex49kO-upbmT0XzZDEgCB2MXdmO2CGvIeCWZBGVEOxZsyGkZp0p_D5rOFtFPtsuYOsbXmXC8Dzn_QKB9m0nLa4mkxbc44a0Uy_E5FpiZdN3PwGAm9_v2618Yym5sqxWtpEQvrCJluXw-_Bx2BAZl9h-fECpN6wvpHgJSKme-b_dRywlO6RFmiEH9rbKQ2tGwZUHPfGXtozsQxZUw"/ />
</div>
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Kitchen Detail" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLv4RZL72W3feG3hboYo8-kDucut_giPsyxxuOAUBivSQhWmK9yZpg9tHLn6M3JhTUsZFHGiE_A4DnUJkASs5NSmqcYd-IJY5pgQICHkXsd81Xf44uPZCW1d1OoqTOXJUWXmsPgtlXbZO5Vv1nb-3UALLCh0WXCaDu4XOdh7Bxi9TIH7IdE9gBEUguB1ZqgKBctUGnQjgHEbGblhOINsMtc8zGA0qjtUCbTDvfW4TYef9uq0CzehlBgEOS0"/ />
</div>
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Interior Detail" className="w-full h-full object-cover grayscale" src="https://lh3.googleusercontent.com/aida/AP1WRLtpR4_F8gt0W4sZ7qORkPxaMdWzVe2HYgoDir3Ox6sO6a69Oo43J_n9VSyyfRIYERz3Fl1NzaYWEczbBSMTgnigdkdcCJKuuBFAuK1x8GXqfbsrjSt2SRdKNznGUN3lvuhocqDPTbLuPEcB2KvWu1efeR3xwEsH-fcYAXKVwrKg-RSJsFh5V5-jJt_H1btIl8ua6QQLq6EpL1Pah-B3taughQAnyOD-0QuA566lEClYqG4OzkpGoaJUvX4v"/ />
</div>
<div className="aspect-square bg-surface-container-high overflow-hidden">
<img alt="Exterior View" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLtgeVoYIPP5RiSr_k4xUWB8rnx0FmmWFBwGLOO9-Q7oWSoEYCcY__cU2JEZWR-Rbj-VlEQjVLoCrpn8u6J466mdGtL8ipOMb0s9F2NfAWegrNPcPlJnokWK0Lnp-Hud1Zpacqho6dUGHfO1eG-AGuReXBygT9o2xOij8mBgi5135xo2UCcZ2pTQMpu3y9VcQ-xKgoCXeLOhtZUYzMJKgKwXMUF-7ZrhHO7pQIOFS98Mnbc1-2dQY20F_Pg"/ />
</div>
</div>
</section>

<footer className="mt-6 pt-6 border-t border-outline-variant flex justify-between items-center">
<div className="flex items-center gap-4">
<div className="w-14 h-14 rounded-full overflow-hidden border border-outline-variant">
<img alt="Elena Vance Agent" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLu0vWxZQkFtNkNPYJKIHRLpcJXK6hXbbXcRiuzbfUMUnHZZ1vS2SfRbEbxzg7gaQv8mUxCRbOUI3T8jpQfaoiew2Nd2wSVL0IkvUvMJSFtPhkXL9BSad_xq-CvKQZYQ3zbmuVBLKyclhWaP-v5N4xVnteNNIMxaqhq2GKzGpGwITPnrADoQ0hPvKgTS56-vq4kBawTUKC3_t2NFHJEleKp5VE1p3uxFPNW1-nTXuM0DO_xSH7O68wcDQnDs"/ />
</div>
<div>
<h3 className="font-label-md text-[13px] font-bold">ELENA VANCE</h3>
<p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-tighter">Principal Luxury Broker</p>
<p className="font-label-sm text-[11px] text-primary">+1 (310) 555-0198 | elena@obsidianvilla.com</p>
</div>
</div>
<div className="text-right">
<p className="font-label-sm text-[9px] text-on-surface-variant leading-tight">
                    © 2024 THE OBSIDIAN VILLA.<br/>ARCHITECTURAL INTEGRITY SECURED.
                </p>
<div className="flex justify-end gap-2 mt-2">
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">share</span>
<span className="material-symbols-outlined text-[18px] text-on-surface-variant">qr_code_2</span>
</div>
</div>
</footer>
</main>
<script>
        // Subtle hover interaction for web view only
        const images = document.querySelectorAll('.aspect-square img, .w-full.h-\\[240px\\] img');
        images.forEach(img => {
            img.addEventListener('mouseenter', () => {
                if (window.matchMedia('(min-width: 1024px)').matches) {
                    img.style.transform = 'scale(1.05)';
                    img.style.transition = 'transform 0.4s ease-out';
                }
            });
            img.addEventListener('mouseleave', () => {
                img.style.transform = 'scale(1)';
            });
        });
    </script>

    </div>
  );
};
export default LayoutStitchFicha;
