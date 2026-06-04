# PropValu — Reglas de diseño de perfiles / dashboards

> Leer al tocar perfiles, dashboards o formularios. Referenciado desde CLAUDE.md (no se auto-carga).

## Campos siempre visibles
Nunca ocultar campos con `{session.campo && <Componente>}`. Si el campo está vacío, mostrar
chip ámbar **"✏️ Pendiente"** clickeable que abra el form de edición. El usuario llena datos en
el registro y espera verlos en el perfil — si no aparecen, piensa que se perdieron.

```jsx
// MALO
{session.phone && <DataRow label="Teléfono" value={session.phone} />}
// BUENO
<DataRow label="Teléfono" value={session.phone} />   // DataRow muestra chip Pendiente si value es falsy
```

## Layout — horizontal sobre vertical
Preferir `grid grid-cols-4` para perfiles con muchos campos. Menos scroll = mejor UX.
- Campos cortos (nombre, tel, años): 1 columna
- Campos medios (email, dirección): `col-span-2`
- Chips/tags (operaciones, cobertura, redes): `col-span-4` en fila fluida
- Separadores de sección: línea fina + título inline con ícono, NO sección con padding enorme

## Jerarquía visual de textos
| Elemento | Clase |
|---|---|
| Título de sección | `text-xs font-bold text-[#1B4332] uppercase tracking-wide` |
| Label de campo | `text-[10px] font-bold text-slate-400 uppercase tracking-wide` |
| Valor del campo | `text-sm text-slate-800 font-medium` |
| Chip pendiente | `text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full` |

## Modelo Pydantic — incluir TODOS los campos de registro
Cuando se agrega un campo al formulario de registro, agregarlo TAMBIÉN al modelo `User` (ahora en
`backend/models.py`). Si no está en el modelo, `extra="ignore"` lo descarta en `/auth/me` y el usuario
no lo ve en el perfil. Verificar con: `grep "campo_nuevo" backend/models.py`

## Refresh de sesión al montar dashboards
Los dashboards leen de `localStorage` que puede estar desactualizado. Siempre fetch silencioso a
`/auth/me` al montar y mergear:
```js
fetch(`${API}/auth/me`, { credentials: "include" })
  .then(r => r.ok ? r.json() : null)
  .then(fresh => { if (fresh?.email) { const merged = { ...stored, ...fresh }; setSession(merged); localStorage.setItem("...", JSON.stringify(merged)); }});
```

## Tabs filtrados por rol
Mostrar tabs según `inmobiliaria_tipo` o `role`. Ej: "Equipo" solo para titulares.
```js
...(esTitular ? [{ id: "equipo", label: "👥 Equipo" }] : [])
```

## Estados vacíos con preview + acción
Cuando una tabla/lista no tiene datos reales, mostrar datos mock con `opacity-50` + banner explicativo.
NO pantalla vacía. Si falta una imagen (logo, foto), el placeholder debe ser un botón que navegue
directo a donde se sube.

## Responsividad móvil (360–414px) — obligatoria en página nueva o cambio de layout
- Grids `grid-cols-4`+ → colapsar a `grid-cols-2`/`grid-cols-1` en móvil
- Tablas anchas → `overflow-x-auto` (+`min-w-[Npx]`) o diseño apilado
- Botones de acción → min 44px de alto (tappable con pulgar)
- Inputs/selects → `w-full` en móvil; texto → `truncate`/`min-w-0` donde aplique
- Si algo no va a funcionar en móvil, avisar antes de dar la tarea por terminada
