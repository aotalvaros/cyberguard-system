# ARCHITECTURAL IMPACT — Threat Statistics Feature

## 1) Objetivo del documento
Definir el impacto arquitectónico de la feature `GET /api/statistics` para facilitar:
- Diagramas de secuencia (flujo runtime)
- Diagramas C4 (Contexto, Contenedores, Componentes)

---

## 2) Estado actual del sistema (baseline)
CyberGuard opera con:
- **Frontend Angular** (dashboard, login, reporte de amenazas)
- **Backend API Node/Express** (auth, threats, ahora statistics)
- **RabbitMQ** (flujo asíncrono de amenazas)
- **Worker Node** (consume eventos y notifica por WebSocket)
- **Redis** (historial de alertas / lectura para agregaciones)

Patrones activos:
- **Event-Driven Architecture** (threat ingestion)
- **Hexagonal (Frontend V2)**
- **Repository, Use Case, Facade, Observer, Strategy, Factory**

---

## 3) Alcance de la nueva feature
### 3.1 Cambios funcionales
- Nuevo endpoint: `GET /api/statistics`
- Nuevo widget en dashboard para visualización de métricas agregadas
- Consulta de datos agregados desde backend (fuente operativa actual: Redis/historial de alertas y/o repositorio de amenazas según implementación)

### 3.2 Componentes impactados
**Backend**
- `StatisticsController` (nuevo/extendido)
- `GetThreatStatisticsUseCase` (nuevo)
- `ThreatRepository` (nuevo método de agregación)
- Middleware auth/JWT (reuso)

**Frontend**
- `GetStatisticsUseCase` (nuevo)
- `StatisticsRepository` (nuevo puerto + implementación HTTP)
- `StatisticsWidgetComponent` (nuevo componente de presentación)
- `DashboardComponent` (integra widget y dispara carga)

**Sin cambios directos**
- RabbitMQ topology
- Worker pipeline de notificaciones en tiempo real

---

## 4) Contrato de comunicación
### 4.1 API
`GET /api/statistics`  
Headers:
- `Authorization: Bearer <jwt>`

Respuesta esperada (ejemplo canónico):
```json
{
  "totalThreats": 1240,
  "bySeverity": {
    "low": 120,
    "medium": 410,
    "high": 500,
    "critical": 210
  },
  "byType": {
    "malware": 330,
    "intrusion": 260,
    "phishing": 290,
    "ddos": 190,
    "ransomware": 170
  },
  "timeWindow": "last_24h",
  "generatedAt": "2026-02-25T10:30:00.000Z"
}
```

### 4.2 Integración con lo existente
- Reusa autenticación JWT y políticas de seguridad ya vigentes.
- No altera el flujo de encolado/procesamiento de amenazas.
- Añade un flujo **sincrónico de lectura** para analítica.

---

## 5) Secuencia objetivo (base para diagrama de secuencia)
1. Usuario autenticado abre Dashboard.
2. `DashboardComponent` ejecuta `GetStatisticsUseCase`.
3. `GetStatisticsUseCase` solicita datos a `StatisticsRepository`.
4. `StatisticsRepository` realiza `GET /api/statistics` al Backend.
5. Backend valida JWT.
6. `StatisticsController` llama `GetThreatStatisticsUseCase`.
7. Use case consulta `ThreatRepository.getStatistics(...)`.
8. Repositorio agrega datos desde almacenamiento (Redis/repo de amenazas).
9. Backend responde payload de estadísticas.
10. Frontend actualiza `StatisticsWidgetComponent`.
11. UI renderiza KPIs y distribución por tipo/severidad.

Notas:
- Flujo independiente del canal WebSocket.
- Puede coexistir con actualización periódica (polling) o manual refresh.

---

## 6) Vista C4 (insumo directo)
## Nivel 1 — System Context
**Actor principal:** Security Admin  
**Sistema:** CyberGuard System  
**Relación relevante:** Security Admin consulta métricas de amenazas y monitorea alertas.

## Nivel 2 — Containers
- **Frontend (Angular SPA):** visualiza dashboard + estadísticas
- **Backend API (Node/Express):** expone `/api/statistics`
- **Redis:** fuente de lectura rápida para agregaciones
- **RabbitMQ + Worker:** pipeline asíncrono de amenazas (contexto operativo, no ruta principal de lectura)

Relaciones nuevas:
- Frontend -> Backend API (`HTTPS GET /api/statistics`)
- Backend API -> Redis (`read/aggregate`)

## Nivel 3 — Components
**Frontend**
- `DashboardComponent`
- `StatisticsWidgetComponent`
- `GetStatisticsUseCase`
- `StatisticsRepositoryImpl (HttpClient)`

**Backend**
- `StatisticsController`
- `GetThreatStatisticsUseCase`
- `ThreatRepository`
- `AuthMiddleware (JWT)`

---

## 7) Patrones arquitectónicos involucrados en esta feature
- **CQRS-lite (lectura separada):** endpoint especializado de lectura agregada.
- **Use Case Pattern:** encapsula lógica de negocio de estadísticas.
- **Repository Pattern:** acceso abstracto a fuente de datos.
- **Hexagonal Frontend:** dominio/aplicación aislados de infraestructura HTTP/UI.
- **Facade (servicios de app):** simplifica consumo desde componentes.

---

## 8) Riesgos, trade-offs y decisiones
- **Consistencia temporal:** estadísticas pueden tener desfase respecto a eventos en tiempo real.
- **Costo de agregación:** definir si se agrega on-read o precompute/cache.
- **Escalabilidad:** agregar paginación/ventanas temporales (`last_1h`, `last_24h`, `last_7d`).
- **Seguridad:** mantener endpoint protegido por JWT + rate limiting.
- **Observabilidad:** métricas de latencia y error rate para `/api/statistics`.

---

## 9) Checklist para diagramado posterior
- [ ] Actor y boundary del sistema (C4 L1)
- [ ] Contenedores y protocolos (C4 L2)
- [ ] Componentes internos FE/BE (C4 L3)
- [ ] Secuencia principal de consulta
- [ ] Flujos alternos: 401, 429, 5xx
- [ ] Datos de entrada/salida del endpoint
- [ ] Dependencias externas (Redis) y decisiones de cache

---

## 10) Estado
Documento listo como fuente para:
1. Diagrama de Secuencia — `Load Dashboard Statistics`
2. Diagrama C4 — Context/Container/Component de `Threat Statistics`
