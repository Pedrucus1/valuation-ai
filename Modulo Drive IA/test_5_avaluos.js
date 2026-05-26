const fs = require('fs');

function cleanNum(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    const s = str.toString().replace(/[^0-9.-]+/g, '');
    return parseFloat(s) || 0;
}

function antiRemate(precios) {
    if (!precios.length) return [];
    if (precios.length <= 2) return precios;
    const prom = precios.reduce((a, b) => a + b, 0) / precios.length;
    const filtrados = precios.filter(p => p >= prom * 0.70);
    return filtrados.length >= 2 ? filtrados : precios.slice().sort((a, b) => b - a).slice(0, 2);
}

function avgArr(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function getRossHeideckeFactor(edad, vidaUtil = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vidaUtil);
    return Math.max(0.20, 1 - 0.5 * (x + Math.pow(x, 2)));
}

function metodoBeta(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    const tipo = (prop.tipo || '').toUpperCase();
    const esRustico = tipo.includes('RÚSTICO') || tipo.includes('RUSTICO');
    const esTerreno = tipo.includes('TERRENO') || esRustico;

    const vistos = new Set();
    const compsUnicos = prop.comparables.filter(c => {
        const t = cleanNum(c.terreno), p = cleanNum(c.precio);
        if (!t || !p) return false;
        const key = t + '-' + p;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
    });

    if (compsUnicos.length === 0) return 0;

    const compsURL = compsUnicos.filter(c => (c.link || '').startsWith('http'));
    const compsPm2 = compsUnicos.filter(c => {
        const link = c.link || '';
        return link.includes('$') && !link.startsWith('http') && cleanNum(link) > 100;
    });

    const factorRH  = getRossHeideckeFactor(prop.edad) / getRossHeideckeFactor(10);
    const factorNeg = 0.95;

    const areaRefURL   = compsURL.length ? avgArr(compsURL.map(c => cleanNum(c.terreno))) : 0;
    const factorSupURL = (areaRefURL > 0 && prop.terreno > 0)
        ? Math.pow(areaRefURL / prop.terreno, 1 / 6) : 1.0;

    const pm2URL        = antiRemate(compsURL.map(c => cleanNum(c.precio) / cleanNum(c.terreno)));
    const pm2TerrenoAvg = avgArr(pm2URL);

    const pm2Perito    = antiRemate(compsPm2.map(c => cleanNum(c.link)));
    const pm2ConstrAvg = avgArr(pm2Perito);

    if (esRustico) {
        const pm2Base = pm2TerrenoAvg || pm2ConstrAvg;
        if (!pm2Base) return 0;
        return pm2Base * prop.terreno * factorSupURL * factorNeg * 0.35;
    }

    if (esTerreno) {
        const pm2Base = pm2TerrenoAvg || pm2ConstrAvg;
        if (!pm2Base) return 0;
        return pm2Base * prop.terreno * factorSupURL * factorNeg;
    }

    if (pm2ConstrAvg > 0 && pm2TerrenoAvg > 0) {
        return pm2TerrenoAvg * prop.terreno * factorSupURL + pm2ConstrAvg * prop.construccion * factorRH * factorNeg;
    }
    if (pm2ConstrAvg > 0) {
        return pm2ConstrAvg * prop.construccion * factorRH * factorNeg + (prop.terreno > 0 ? pm2ConstrAvg * prop.terreno * 0.60 * factorNeg : 0);
    }
    if (pm2TerrenoAvg > 0) {
        return pm2TerrenoAvg * prop.terreno * factorSupURL * factorNeg + pm2TerrenoAvg * prop.construccion * factorRH * 0.50 * factorNeg;
    }
    return 0;
}

function metodoremi(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;
    if (!prop.construccion || prop.construccion === 0) return 0;

    const compsValidos = prop.comparables.filter(c => {
        const m2c = cleanNum(c.construccion);
        const precio = cleanNum(c.precio);
        return m2c > 0 && precio > 0;
    });

    if (compsValidos.length === 0) return 0;

    const pm2c = compsValidos.map(c => cleanNum(c.precio) / cleanNum(c.construccion));
    const pm2cFiltrados = antiRemate(pm2c);
    const indicesFiltrados = pm2c.map((v, i) => i).filter(i => pm2cFiltrados.includes(pm2c[i]));
    const compsFiltrados = indicesFiltrados.map(i => compsValidos[i]);

    let sumaHomologados = 0;
    compsFiltrados.forEach(c => {
        const m2cComp = cleanNum(c.construccion);
        const precio = cleanNum(c.precio);
        const precioUnitario = precio / m2cComp;
        const factorSup = Math.pow(m2cComp / prop.construccion, 1 / 6);
        const factorEdad = Math.max(0.70, 1 - (prop.edad - 10) * 0.01);
        sumaHomologados += precioUnitario * factorSup * factorEdad;
    });

    return (sumaHomologados / compsFiltrados.length) * prop.construccion;
}

const MXN = v => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
const pct = (calc, real) => (((calc / real) - 1) * 100).toFixed(1) + '%';

const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));

const validos = data.filter(d =>
    d.fileName && d.fileName.includes('-26-') &&
    d.valorMercado && d.valorMercado !== 'No hallado' &&
    cleanNum(d.valorMercado) > 0 &&
    (cleanNum(d.m2Construccion) > 0 || cleanNum(d.m2Terreno) > 0) &&
    d.comparables && d.comparables.length >= 3 &&
    !(d.tipo || '').toUpperCase().includes('EJIDAL')
);

console.log(`\nTotal válidos: ${validos.length} — mostrando 5\n`);
console.log('='.repeat(100));

let betaErrors = [], remiErrors = [];

validos.slice(0, 5).forEach((d, idx) => {
    let edad = 10;
    if (d.edad) { const n = cleanNum(d.edad); if (n > 0) edad = n; }

    const prop = {
        tipo: d.tipo,
        terreno: cleanNum(d.m2Terreno),
        construccion: cleanNum(d.m2Construccion),
        valorReal: cleanNum(d.valorMercado),
        edad,
        comparables: d.comparables
    };

    const beta = Math.round(metodoBeta(prop));
    const remi = Math.round(metodoremi(prop));

    const compsConM2C = prop.comparables.filter(c => cleanNum(c.construccion) > 0).length;

    console.log(`[${idx+1}] ${d.fileName}`);
    console.log(`    Tipo: ${prop.tipo} | m²C: ${prop.construccion} | m²T: ${prop.terreno} | Edad: ${edad} años | Comps: ${prop.comparables.length}`);
    console.log(`    Comps con m²C: ${compsConM2C}/${prop.comparables.length}`);
    console.log(`    Perito:  ${MXN(prop.valorReal)}`);

    if (beta > 0) {
        const err = ((beta / prop.valorReal) - 1) * 100;
        betaErrors.push(Math.abs(err));
        console.log(`    Beta:    ${MXN(beta)}  (${err > 0 ? '+' : ''}${err.toFixed(1)}%)`);
    } else {
        console.log(`    Beta:    N/A`);
    }

    if (remi > 0) {
        const err = ((remi / prop.valorReal) - 1) * 100;
        remiErrors.push(Math.abs(err));
        console.log(`    remi:  ${MXN(remi)}  (${err > 0 ? '+' : ''}${err.toFixed(1)}%)`);
    } else {
        console.log(`    remi:  N/A — necesita re-extracción (comparables sin m²C)`);
    }
    console.log('='.repeat(100));
});

if (betaErrors.length > 0) {
    console.log(`\nError promedio Beta (5 ejemplos): ${(betaErrors.reduce((a,b)=>a+b,0)/betaErrors.length).toFixed(1)}%`);
}
if (remiErrors.length > 0) {
    console.log(`Error promedio remi (5 ejemplos): ${(remiErrors.reduce((a,b)=>a+b,0)/remiErrors.length).toFixed(1)}%`);
}
