import React from "react";
import { useParams } from "react-router-dom";
import { PlasmicComponent, PlasmicRootProvider } from "@plasmicapp/loader-react";
import { PLASMIC } from "./plasmic-init";

// Renderiza cualquier página que hayas diseñado en Plasmic Studio.
// Ruta: /diseno/:pageSlug  ->  ej. /diseno/Homepage
export default function PlasmicPage() {
  const { pageSlug = "Homepage" } = useParams();

  return (
    <PlasmicRootProvider loader={PLASMIC}>
      <PlasmicComponent component={pageSlug} />
    </PlasmicRootProvider>
  );
}
