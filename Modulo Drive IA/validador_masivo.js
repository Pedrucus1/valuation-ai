const fs = require('fs');
const googleSheetsConnector = require('../services/googleSheetsConnector');
const { google } = require('googleapis');

function cleanNumberString(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    const cleanStr = str.toString().replace(/[^0-9.-]+/g, "");
    return parseFloat(cleanStr) || 0;
}

function metodoNuevoEstricto(prop) {
    const factorNegociacion = 0.95; 
    let sumaValoresHomologados = 0;
    
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    prop.comparables.forEach(c => {
        let precio = cleanNumberString(c.precio);
        let constrComp = cleanNumberString(c.terreno); // El bot guarda la constr en 'terreno' 
        if (constrComp === 0) return;

        const precioUnitario = precio / constrComp;
        let factorSuperficie = Math.pow(constrComp / prop.construccion, 1/6); 
        let factorEdad = 1; 
        
        const precioHomologadoM2 = precioUnitario * factorNegociacion * factorSuperficie * factorEdad;
        sumaValoresHomologados += (precioHomologadoM2 * prop.construccion);
    });

    return sumaValoresHomologados / prop.comparables.length;
}

function getEdadPct(age) {
    if (!age || age <= 0) return 1.0;
    return Math.max(0.20, 1 - (age * 0.005));
}

function metodoViejoPropValu(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    let sumaValoresHomologados = 0;
    let edadSujeto = prop.edad || 10;
    const pctEdadSujeto = getEdadPct(edadSujeto);
    const N_RAIZ = 6;
    let compsValidos = 0;

    prop.comparables.forEach(c => {
        let precio = cleanNumberString(c.precio);
        let constrComp = cleanNumberString(c.terreno); // El bot guarda la constr de comp en 'terreno'
        if (constrComp === 0 || precio === 0) return;

        const precioUnitario = precio / constrComp;

        // Factor Superficie (exponencial inversa)
        const factorSuperficie = Math.pow(constrComp / prop.construccion, 1 / N_RAIZ);

        // Factor Edad (Ross-Heidecke Simplificado de PropValu)
        const pctEdadComp = getEdadPct(10); // Asumiendo comp edad = 10
        const factorEdad = pctEdadComp > 0 ? (pctEdadSujeto / pctEdadComp) : 1.0;

        // Factores por defecto (Conservación, Acabados, Ubicación = 1.0)
        const factorConservacion = 1.0;
        const factorAcabados = 1.0;
        const factorUbicacion = 1.0;
        const factorNegociacion = 0.95; // -5% default in PropValu

        const factorResultante = factorSuperficie * factorEdad * factorConservacion * factorAcabados * factorUbicacion * factorNegociacion;
        
        const precioUnitarioHomologado = precioUnitario * factorResultante;
        sumaValoresHomologados += (precioUnitarioHomologado * prop.construccion);
        compsValidos++;
    });

    if (compsValidos === 0) return 0;
    return sumaValoresHomologados / compsValidos;
}

function metodoPromptExperto(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    const tipo = (prop.tipo || '').toUpperCase();
    const esTerreno = tipo.includes('TERRENO') || tipo.includes('BODEGA') || tipo.includes('LOCAL') || tipo.includes('COMERCIAL');
    const divisorSujeto = esTerreno ? prop.terreno : prop.construccion;
    
    if (!divisorSujeto || divisorSujeto === 0) return 0;

    let preciosM2 = [];
    prop.comparables.forEach(c => {
        let precio = cleanNumberString(c.precio);
        let areaComp = cleanNumberString(c.terreno); // Bot grabs this as area
        if (precio > 0 && areaComp > 0) {
            preciosM2.push(precio / areaComp);
        }
    });

    if (preciosM2.length === 0) return 0;

    // Filtro Experto: Descarta propiedades 30% por debajo del promedio (Remates falsos)
    let promedioInicial = preciosM2.reduce((a, b) => a + b, 0) / preciosM2.length;
    const limiteInferior = promedioInicial * 0.70;
    
    let preciosM2Filtrados = preciosM2.filter(pm2 => pm2 >= limiteInferior);
    if (preciosM2Filtrados.length === 0) return 0;

    let promedioReal = preciosM2Filtrados.reduce((a, b) => a + b, 0) / preciosM2Filtrados.length;
    let promedioNegociado = promedioReal * 0.95; // Factor de negociación

    return promedioNegociado * divisorSujeto;
}

function getRossHeideckeFactor(edad, vidaUtil = 70) {
    if (edad <= 0) return 1.0;
    const x = Math.min(1, edad / vidaUtil);
    return Math.max(0.20, 1 - 0.5 * (x + Math.pow(x, 2)));
}

function avgArr(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function antiRemate(precios) {
    if (!precios.length) return [];
    // Con ≤2 comps no hay masa suficiente para filtrar
    if (precios.length <= 2) return precios;
    const prom = precios.reduce((a, b) => a + b, 0) / precios.length;
    const filtrados = precios.filter(p => p >= prom * 0.70);
    // Garantizar mínimo 2 comps; si el filtro dejó solo 1, rescatar el siguiente mejor
    return filtrados.length >= 2 ? filtrados : precios.slice().sort((a, b) => b - a).slice(0, 2);
}

function metodoBetaPropValu(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;

    const tipo = (prop.tipo || '').toUpperCase();
    const esRustico = tipo.includes('RÚSTICO') || tipo.includes('RUSTICO');
    const esTerreno = tipo.includes('TERRENO') || esRustico;

    // Deduplicar comparables por precio+area
    const vistos = new Set();
    const compsUnicos = prop.comparables.filter(c => {
        const t = cleanNumberString(c.terreno), p = cleanNumberString(c.precio);
        if (!t || !p) return false;
        const key = t + '-' + p;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
    });

    if (compsUnicos.length === 0) return 0;

    // Separar: comps de mercado (URL) vs $/m2 de construcción (link con $)
    const compsURL = compsUnicos.filter(c => (c.link || '').startsWith('http'));
    const compsPm2 = compsUnicos.filter(c => {
        const link = c.link || '';
        return link.includes('$') && !link.startsWith('http') && cleanNumberString(link) > 100;
    });

    // Factor edad relativo (sujeto vs comp asumido 10 años promedio de mercado)
    const factorRH  = getRossHeideckeFactor(prop.edad) / getRossHeideckeFactor(10);
    const factorNeg = 0.95;

    // Factor superficie: ajusta diferencia de tamaño entre sujeto y comps URL
    const areaRefURL   = compsURL.length ? avgArr(compsURL.map(c => cleanNumberString(c.terreno))) : 0;
    const factorSupURL = (areaRefURL > 0 && prop.terreno > 0)
        ? Math.pow(areaRefURL / prop.terreno, 1 / 6) : 1.0;

    // $/m2 de mercado bruto (comps URL, filtrado anti-remate)
    const pm2URL        = antiRemate(compsURL.map(c => cleanNumberString(c.precio) / cleanNumberString(c.terreno)));
    const pm2TerrenoAvg = avgArr(pm2URL);

    // $/m2 de construcción que usó el perito (campo link con valor "$X")
    const pm2Perito    = antiRemate(compsPm2.map(c => cleanNumberString(c.link)));
    const pm2ConstrAvg = avgArr(pm2Perito);

    // ─── TERRENOS RÚSTICOS (comps urbanos → descuento rural 0.35) ────────────
    if (esRustico) {
        const pm2Base = pm2TerrenoAvg || pm2ConstrAvg;
        if (!pm2Base) return 0;
        return pm2Base * prop.terreno * factorSupURL * factorNeg * 0.35;
    }

    // ─── TERRENOS URBANOS (sin depreciación por edad) ────────────────────────
    if (esTerreno) {
        const pm2Base = pm2TerrenoAvg || pm2ConstrAvg;
        if (!pm2Base) return 0;
        return pm2Base * prop.terreno * factorSupURL * factorNeg;
    }

    // ─── CASAS / DEPTOS / MIXTOS / LOCALES — Suma de Partes ─────────────────
    if (pm2ConstrAvg > 0 && pm2TerrenoAvg > 0) {
        const valorTerreno = pm2TerrenoAvg * prop.terreno * factorSupURL;
        const valorConstr  = pm2ConstrAvg  * prop.construccion * factorRH * factorNeg;
        return valorTerreno + valorConstr;
    }

    if (pm2ConstrAvg > 0) {
        const valorConstr  = pm2ConstrAvg * prop.construccion * factorRH * factorNeg;
        const valorTerreno = prop.terreno > 0 ? pm2ConstrAvg * prop.terreno * 0.60 * factorNeg : 0;
        return valorConstr + valorTerreno;
    }

    // FALLBACK: solo URL comps de terreno
    if (pm2TerrenoAvg > 0) {
        const valorTerreno = pm2TerrenoAvg * prop.terreno * factorSupURL * factorNeg;
        const valorConstr  = pm2TerrenoAvg * prop.construccion * factorRH * 0.50 * factorNeg;
        return valorTerreno + valorConstr;
    }

    return 0;
}

function metodoremi(prop) {
    if (!prop.comparables || prop.comparables.length === 0) return 0;
    if (!prop.construccion || prop.construccion === 0) return 0;

    const compsValidos = prop.comparables.filter(c => {
        const m2c = cleanNumberString(c.construccion);
        const precio = cleanNumberString(c.precio);
        return m2c > 0 && precio > 0;
    });

    if (compsValidos.length === 0) return 0;

    // $/m²C por comp
    const pm2c = compsValidos.map(c => {
        const m2c = cleanNumberString(c.construccion);
        const precio = cleanNumberString(c.precio);
        return precio / m2c;
    });

    // Anti-remate antes de homologar
    const pm2cFiltrados = antiRemate(pm2c);
    const indicesFiltrados = pm2c.map((v, i) => i).filter(i => pm2cFiltrados.includes(pm2c[i]));
    const compsFiltrados = indicesFiltrados.map(i => compsValidos[i]);

    let sumaHomologados = 0;
    compsFiltrados.forEach(c => {
        const m2cComp = cleanNumberString(c.construccion);
        const precio = cleanNumberString(c.precio);
        const precioUnitario = precio / m2cComp;

        // Factor Superficie: ajusta tamaño relativo usando m²C
        const factorSup = Math.pow(m2cComp / prop.construccion, 1 / 6);

        // Factor Edad: lineal 1% por año de diferencia (comp asumido 10 años)
        const edadComp = 10;
        const factorEdad = Math.max(0.70, 1 - (prop.edad - edadComp) * 0.01);

        sumaHomologados += precioUnitario * factorSup * factorEdad;
    });

    const pm2cHomologadoAvg = sumaHomologados / compsFiltrados.length;
    return pm2cHomologadoAvg * prop.construccion;
}

async function runValidation() {
    console.log("Cargando cerebro_datos.json...");
    const data = JSON.parse(fs.readFileSync('cerebro_datos.json', 'utf8'));
    
    const validos = data.filter(d => 
        d.fileName && d.fileName.includes('-26-') &&
        d.valorMercado && d.valorMercado !== 'No hallado' &&
        cleanNumberString(d.valorMercado) > 0 &&
        (cleanNumberString(d.m2Construccion) > 0 || cleanNumberString(d.m2Terreno) > 0) &&
        d.comparables && d.comparables.length >= 3 &&
        !(d.tipo || '').toUpperCase().includes('EJIDAL')
    );

    console.log(`Generando reporte para ${validos.length} avalúos válidos...`);
    
    const rows = [
        ['Archivo (Sujeto)', 'Tipo', 'M2 Const', 'M2 Terr', 'Valor Real Perito', 'Valor Motor Beta', 'Dif % Beta', 'Valor remi', 'Dif % remi', '# Comparables']
    ];

    validos.forEach(d => {
        let edadParsed = 10;
        if (d.edad && d.edad !== 'undefined') {
            const num = cleanNumberString(d.edad);
            if (num > 0) edadParsed = num;
        }

        const prop = {
            tipo: d.tipo,
            terreno: cleanNumberString(d.m2Terreno),
            construccion: cleanNumberString(d.m2Construccion),
            valorReal: cleanNumberString(d.valorMercado),
            edad: edadParsed,
            comparables: d.comparables
        };
        
        const valorBeta = Math.round(metodoBetaPropValu(prop));
        const valorremi = Math.round(metodoremi(prop));

        if (valorBeta > 0 || valorremi > 0) {
            const diffBeta = valorBeta > 0 ? (((valorBeta / prop.valorReal) - 1) * 100).toFixed(2) + '%' : 'N/A';
            const diffremi = valorremi > 0 ? (((valorremi / prop.valorReal) - 1) * 100).toFixed(2) + '%' : 'N/A';

            rows.push([
                d.fileName,
                prop.tipo,
                prop.construccion,
                prop.terreno,
                prop.valorReal,
                valorBeta || 'N/A',
                diffBeta,
                valorremi || 'N/A',
                diffremi,
                prop.comparables.length
            ]);
        }
    });

    try {
        const auth = await googleSheetsConnector.authenticate();
        const sheets = google.sheets({ version: 'v4', auth });
        const targetSpreadsheetId = '1du6IWWN1mKXPlzwENsLjHPD_1kWkBXvtPBsGjZ6evbM';
        
        console.log("Enviando resultados a Google Sheets...");
        
        // Asumiendo que usaremos la Hoja 2 para no borrar la Hoja 1
        await sheets.spreadsheets.values.update({
            spreadsheetId: targetSpreadsheetId,
            range: 'Comparativa 3 Motores!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: rows },
        });
        
        console.log(`¡Exportación exitosa! Revisa la pestaña 'Comparativa 3 Motores' en: https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}`);
    } catch (err) {
        console.error("Error conectando a Sheets (Asegúrate de que la 'Hoja 2' exista):", err.message);
    }
}

runValidation();
