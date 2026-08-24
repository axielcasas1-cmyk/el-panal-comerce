# ProofStay — NO-STOP / Continuidad primero

Este directorio existe únicamente en la rama aislada `proofstay-continuity-rc2` y no modifica `main`.

## Regla operativa
Un timeout, conector caído, proveedor no disponible, despliegue fallido o degradación parcial no detiene ProofStay. Se cambia inmediatamente a la siguiente ruta segura disponible.

Estados diferenciados:
- `APP_DOWN`: aplicación/servicio no disponible.
- `OBSERVABILITY_DEGRADED`: no se pueden certificar colas internas; no implica caída.
- `BACKEND_DEGRADED`: backend parcialmente disponible.
- `DEPLOYMENT_DEGRADED`: pipeline de publicación afectado; último deployment estable sigue siendo referencia.

## Rutas de escape
1. Ruta A — servicio primario normal.
2. Ruta B — reintento acotado + health mínimo.
3. Ruta C — espejo/failover independiente.
4. Ruta D — último deployment conocido estable / rollback.
5. Ruta E — operación degradada segura, preferentemente lectura y funciones esenciales.

Nunca repetir escrituras a ciegas. Las migraciones deben ser idempotentes. Ninguna mitigación se considera completada sin health-check independiente.

## Release candidata
- RC: `1.0.0-rc.2`
- Backend operativo: Lovable project `bb06520e-f517-4ef6-8887-696ad20efc1b`
- Unified: `https://proofstay-unified-2026.vercel.app`
- Operations: `https://proofstay-operations.vercel.app`
- Admin seguro: `https://proofstay-admin-security.vercel.app`
- Founding Pilot: `https://proofstay-founding-pilot.vercel.app`
- Billing: fuera del camino crítico / OFF.

## RC2 pendiente de activación final
Botón Actualizar app, mapa oscuro/neón VERIFIED, pasaportes y alertas de vencimiento 30/15/7/3/1/0, acknowledge e incorporación de nuevo admin con AAL2/TOTP.

El paquete local RC2 está sellado por SHA-256 y debe verificarse antes de cualquier despliegue.
