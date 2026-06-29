"""
_reset_enrich_portal.py — Limpia enrich_last_attempt de un portal para forzar re-enriquecimiento.
También limpia enrich_dead=404 opcionalmentre para re-intentar muertos.

Uso:
  python _reset_enrich_portal.py PINCALI              # resetea cooldown
  python _reset_enrich_portal.py PROPIEDADES_COM      # resetea cooldown
  python _reset_enrich_portal.py PINCALI --include-dead  # también limpia 404s
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv()
from pymongo import MongoClient

portal = sys.argv[1] if len(sys.argv) > 1 else None
if not portal:
    print('Uso: python _reset_enrich_portal.py PORTAL [--include-dead]')
    sys.exit(1)

include_dead = '--include-dead' in sys.argv
col = MongoClient(os.getenv('MONGO_URL'))['propvalu']['mercado_props']

# Contar antes
total = col.count_documents({'portal_origen': portal})
con_attempt = col.count_documents({'portal_origen': portal, 'enrich_last_attempt': {'$exists': True}})
print(f'{portal}: {total:,} docs totales | {con_attempt:,} con enrich_last_attempt')

# Resetear cooldown — unset enrich_last_attempt en activos (no dead 404, a menos que --include-dead)
q = {'portal_origen': portal, 'activo': {'$ne': False}}
if not include_dead:
    q['enrich_dead'] = {'$exists': False}

r = col.update_many(q, {'$unset': {'enrich_last_attempt': ''}})
print(f'Cooldown reseteado: {r.modified_count:,} docs')

if include_dead:
    r2 = col.update_many(
        {'portal_origen': portal, 'enrich_dead': {'$exists': True}},
        {'$unset': {'enrich_dead': '', 'enrich_dead_at': ''}, '$set': {'activo': True}}
    )
    print(f'Dead 404s reactivados: {r2.modified_count:,} docs')

print('Listo. Ya puedes correr: python enricher.py --mongo --tab', portal)
