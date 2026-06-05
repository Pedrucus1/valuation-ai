const fs = require('fs');
const path = 'c:/Users/pedru/valuation-ai/Pagina-Valuacion-con-Ai--main/frontend/src/pages/InmobiliariaDashboardPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace(
  'const MercadoViewM = React.memo(MercadoView);',
  `const MercadoViewM = React.memo(MercadoView);

const FacturacionTab = React.lazy(() => import('@/components/dashboard/tabs/FacturacionTab'));
const PromocionesTab = React.lazy(() => import('@/components/dashboard/tabs/PromocionesTab'));
const DataExchangeTab = React.lazy(() => import('@/components/dashboard/tabs/DataExchangeTab'));`
);

// 2. Remove FacturacionTab
content = content.replace(/\/\* ── Facturación Tab ── \*\/(?:.|\n)*?\/\* ── Promociones Tab ── \*\//, '/* ── Promociones Tab ── */');

// 3. Remove PromocionesTab
// PromocionesTab is followed by Publicidad Tab
content = content.replace(/\/\* ── Promociones Tab ── \*\/(?:.|\n)*?\/\* ── Publicidad Tab ── \*\//, '/* ── Publicidad Tab ── */');

// 4. Remove DataExchangeTab
// DataExchangeTab is followed by the return statement of the main component
content = content.replace(/\/\* ── Data Exchange Tab ── \*\/(?:.|\n)*?(return \(\n\s*<div className="min-h-screen)/, '$1');

// 5. Update render block with Suspense and props
const renderBlockOld = `{/* Tab: Resumen */}
        {activeTab === "resumen" && (
          <>
            <StatCards />
            <ResumenExtra />
            <ResumenMercado />
          </>
        )}

        {/* Tab: Mercado */}
        {activeTab === "mercado" && (
          <MercadoViewM
            modo="inmobiliaria"
            nombreUsuario={session?.empresa || session?.name || "Inmobiliaria"}
            valuacionesPropias={valuacionesList}
            planId={session?.plan || ""}
            API={API}
          />
        )}

        {/* Tab: Valuaciones */}
        {activeTab === "valuaciones" && (
          <>
            <div className="flex items-center justify-end mb-4">
              <Button
                onClick={() => navigate("/valuar")}
                className="bg-[#52B788] hover:bg-[#40916C] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Valuación
              </Button>
            </div>
            <ValuacionesTable />
          </>
        )}

        {/* Tab: Equipo */}
        {activeTab === "equipo" && <EquipoTable />}

        {/* Tab: Documentos */}
        {activeTab === "documentos" && <DocumentosTab />}

        {/* Tab: Perfil */}
        {activeTab === "perfil" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={editandoPerfil ? () => setEditandoPerfil(false) : abrirEdicion}
                className="text-sm font-semibold text-[#1B4332] hover:text-[#52B788] transition-colors flex items-center gap-1.5"
              >
                {editandoPerfil ? "✕ Cancelar" : "✏️ Editar perfil"}
              </button>
            </div>

            {editandoPerfil && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <p className="font-['Outfit'] font-semibold text-[#1B4332] text-base">Editar datos de perfil</p>

                <div className="grid grid-cols-2 gap-4">
                  <EF label="Teléfono" field="phone" placeholder="55 1234 5678" />
                  <EF label="Dirección de oficina" field="q_dir_oficina" placeholder="Av. López Mateos 123, Zapopan" />
                  <EF label="Google Maps URL" field="q_maps_url" placeholder="https://maps.google.com/..." />
                  <EF label="Asociación (AMPI, CANACO...)" field="asociacion" placeholder="AMPI Jalisco" />
                  <div className="col-span-2">
                    <EF label="Cursos y certificaciones" field="cursos" placeholder="Certificado AMPI 2023, Curso INFONAVIT..." />
                  </div>
                  <div className="col-span-2">
                    <EF label="Galardones y reconocimientos" field="galardones" placeholder="Premio AMPI 2023, Mejor Agente del Año..." />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Redes sociales</p>
                  <div className="grid grid-cols-2 gap-3">
                    <EF label="Sitio web" field="redes_web" placeholder="https://miinmobiliaria.mx" />
                    <EF label="Instagram" field="redes_ig" placeholder="@miinmobiliaria" />
                    <EF label="WhatsApp" field="redes_wa" placeholder="33 1234 5678" />
                    <EF label="Facebook" field="redes_fb" placeholder="/miinmobiliaria o URL" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setEditandoPerfil(false)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarPerfil}
                    disabled={guardando}
                    className="bg-[#1B4332] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
                  >
                    {guardando ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </div>
            )}

            <PerfilCard />
          </div>
        )}

        {/* Tab: Reseñas */}
        {activeTab === "resenas" && <ReseñasTab />}
        {activeTab === "facturacion" && <FacturacionTab />}

        {/* Tab: Publicidad */}
        {activeTab === "publicidad" && <PublicidadTab />}

        {/* Tab: Promociones */}
        {activeTab === "promociones" && <PromocionesTab />}

        {/* Tab: Data Exchange */}
        {activeTab === "data_exchange" && <DataExchangeTab />}`;

const renderBlockNew = `<React.Suspense fallback={<p>Cargando pestaña...</p>}>
          {/* Tab: Resumen */}
          {activeTab === "resumen" && (
            <>
              <StatCards />
              <ResumenExtra />
              <ResumenMercado />
            </>
          )}

          {/* Tab: Mercado */}
          {activeTab === "mercado" && (
            <MercadoViewM
              modo="inmobiliaria"
              nombreUsuario={session?.empresa || session?.name || "Inmobiliaria"}
              valuacionesPropias={valuacionesList}
              planId={session?.plan || ""}
              API={API}
            />
          )}

          {/* Tab: Valuaciones */}
          {activeTab === "valuaciones" && (
            <>
              <div className="flex items-center justify-end mb-4">
                <Button
                  onClick={() => navigate("/valuar")}
                  className="bg-[#52B788] hover:bg-[#40916C] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Valuación
                </Button>
              </div>
              <ValuacionesTable />
            </>
          )}

          {/* Tab: Equipo */}
          {activeTab === "equipo" && <EquipoTable />}

          {/* Tab: Documentos */}
          {activeTab === "documentos" && <DocumentosTab />}

          {/* Tab: Perfil */}
          {activeTab === "perfil" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={editandoPerfil ? () => setEditandoPerfil(false) : abrirEdicion}
                  className="text-sm font-semibold text-[#1B4332] hover:text-[#52B788] transition-colors flex items-center gap-1.5"
                >
                  {editandoPerfil ? "✕ Cancelar" : "✏️ Editar perfil"}
                </button>
              </div>

              {editandoPerfil && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  <p className="font-['Outfit'] font-semibold text-[#1B4332] text-base">Editar datos de perfil</p>

                  <div className="grid grid-cols-2 gap-4">
                    <EF label="Teléfono" field="phone" placeholder="55 1234 5678" />
                    <EF label="Dirección de oficina" field="q_dir_oficina" placeholder="Av. López Mateos 123, Zapopan" />
                    <EF label="Google Maps URL" field="q_maps_url" placeholder="https://maps.google.com/..." />
                    <EF label="Asociación (AMPI, CANACO...)" field="asociacion" placeholder="AMPI Jalisco" />
                    <div className="col-span-2">
                      <EF label="Cursos y certificaciones" field="cursos" placeholder="Certificado AMPI 2023, Curso INFONAVIT..." />
                    </div>
                    <div className="col-span-2">
                      <EF label="Galardones y reconocimientos" field="galardones" placeholder="Premio AMPI 2023, Mejor Agente del Año..." />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Redes sociales</p>
                    <div className="grid grid-cols-2 gap-3">
                      <EF label="Sitio web" field="redes_web" placeholder="https://miinmobiliaria.mx" />
                      <EF label="Instagram" field="redes_ig" placeholder="@miinmobiliaria" />
                      <EF label="WhatsApp" field="redes_wa" placeholder="33 1234 5678" />
                      <EF label="Facebook" field="redes_fb" placeholder="/miinmobiliaria o URL" />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setEditandoPerfil(false)}
                      className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={guardarPerfil}
                      disabled={guardando}
                      className="bg-[#1B4332] text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[#2D6A4F] disabled:opacity-50 transition-colors"
                    >
                      {guardando ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              )}

              <PerfilCard />
            </div>
          )}

          {/* Tab: Reseñas */}
          {activeTab === "resenas" && <ReseñasTab />}
          {activeTab === "facturacion" && <FacturacionTab billingData={billingData} session={session} saveBillingPref={saveBillingPref} savingPref={savingPref} />}

          {/* Tab: Publicidad */}
          {activeTab === "publicidad" && <PublicidadTab />}

          {/* Tab: Promociones */}
          {activeTab === "promociones" && <PromocionesTab valuacionesList={valuacionesList} session={session} />}

          {/* Tab: Data Exchange */}
          {activeTab === "data_exchange" && <DataExchangeTab />}
        </React.Suspense>`;

content = content.replace(renderBlockOld, renderBlockNew);

fs.writeFileSync(path, content, 'utf8');
console.log('Done refactoring!');
