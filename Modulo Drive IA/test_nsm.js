require('dotenv').config({ path: '../.env' });
const { valuarPropiedadCompleto } = require('./motor_remi_api');
(async()=>{
  const prop={tipo:'CASA HABITACION',colonia:'Nueva Santa Maria',municipio:'Tlaquepaque',
    construccion:76.12,terreno:254,edad:36,estadoConservacion:'regular_medio',esEjidal:false};
  const r=await valuarPropiedadCompleto(prop);
  console.log(`OPI-26-5-16 Nueva Santa Maria | pool:${r.poolTipo} n:${r.nComps} pm2cAvg:${r.pm2cAvg}`);
  console.log(`  VALOR MOTOR: ${Math.round((r.valor||0)/1000)}k  vs perito 2,030k  (antes: 969k / -52%)`);
})();
