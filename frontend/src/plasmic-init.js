import { initPlasmicLoader } from "@plasmicapp/loader-react";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.REACT_APP_PLASMIC_PROJECT_ID,
      token: process.env.REACT_APP_PLASMIC_TOKEN,
    },
  ],
  // preview: true muestra los últimos cambios sin publicar (bueno mientras diseñas).
  // Cambia a false cuando quieras que solo se vea lo ya publicado con "Publish".
  preview: true,
});
