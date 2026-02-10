# 🤖 AI Workflow - CyberGuard System

## Estrategia de Interacción con IA

### Metodología: Prompting por Capas

Implementamos un enfoque estructurado de **Prompting por Capas** donde cada interacción con IA sigue un flujo progresivo:

#### Capa 1: Contexto Arquitectónico
- Proporcionar a la IA el contexto completo del sistema distribuido
- Especificar patrones de microservicios y comunicación asíncrona
- Definir restricciones de seguridad y resiliencia desde el inicio

#### Capa 2: Especificación Funcional
- Detallar el caso de uso específico (ej: detector de amenazas, notificador)
- Incluir criterios de aceptación y casos edge
- Mencionar explícitamente requisitos no funcionales (performance, seguridad)

#### Capa 3: Validación Técnica
- Solicitar a la IA que explique su solución antes de generar código
- Pedir alternativas y trade-offs
- Validar que considere patrones de resiliencia (circuit breaker, retry, timeout)

#### Capa 4: Refinamiento Humano
- Aplicar **Human Checks** obligatorios en código crítico
- QA valida vulnerabilidades y malas prácticas
- Documentar decisiones donde se rechazó código de IA

---

## Interacciones Clave con IA

### 1. Diseño de Arquitectura
**Prompt Tipo:**
```
"Diseña la arquitectura de microservicios para un sistema de alertas de ciberseguridad.
Debe incluir: detector de amenazas, analizador de logs, notificador en tiempo real.
Usa RabbitMQ para comunicación asíncrona. Considera patrones de resiliencia y
escalabilidad. Explica tu decisión antes de dar código."
```

### 2. Implementación de Servicios
**Prompt Tipo:**
```
"Implementa el microservicio [NOMBRE] usando [TECNOLOGÍA].
Requisitos de seguridad: [LISTA].
Debe manejar fallos de RabbitMQ con reintentos exponenciales.
Incluye validación de entrada y sanitización.
Marca con comentarios las secciones que requieren Human Check."
```

### 3. Configuración de Infraestructura
**Prompt Tipo:**
```
"Crea la configuración de RabbitMQ con exchanges y queues para [CASO DE USO].
Usa variables de entorno para credenciales.
Implementa dead letter queues para mensajes fallidos.
Explica la topología antes de generar código."
```

### 4. Testing y Validación
**Prompt Tipo:**
```
"Genera tests de integración para [SERVICIO] que validen:
- Manejo de mensajes duplicados
- Comportamiento ante caída de RabbitMQ
- Validación de payloads maliciosos
Usa mocks apropiados y aserciones específicas."
```

---

## Documentos Clave y Contextualización

### Documentos que SIEMPRE se proporcionan a la IA:

1. **README.md** - Visión general del sistema
2. **ARCHITECTURE.md** - Diagrama y decisiones arquitectónicas
3. **API_CONTRACTS.md** - Contratos de mensajes RabbitMQ
4. **SECURITY_GUIDELINES.md** - Checklist de seguridad obligatorio
5. **Este archivo (AI_WORKFLOW.md)** - Para mantener consistencia

### Contexto Mínimo por Interacción:
```
"Contexto: Sistema distribuido de alertas de ciberseguridad.
Stack: [Node.js/Python/Java], RabbitMQ, Docker.
Patrón actual: Event-driven con CQRS.
Restricción: Código debe pasar validación de seguridad del QA."
```

---

## Dinámicas de Interacción

### 🔄 Ciclo de Desarrollo con IA

```
1. Developer escribe prompt siguiendo "Prompting por Capas"
   ↓
2. IA genera solución + explicación
   ↓
3. Developer aplica "Human Check" en código crítico
   ↓
4. QA Engineer valida:
   - Vulnerabilidades (OWASP Top 10)
   - Malas prácticas (hardcoded secrets, SQL injection)
   - Resiliencia (manejo de errores, timeouts)
   ↓
5. Si falla QA → Rechazar y documentar en "Anti-Pattern Log"
   ↓
6. Si pasa QA → Code Review por par
   ↓
7. Merge a develop siguiendo Git Flow
```

### 🛡️ Protocolo de Validación QA

El QA Engineer debe verificar en CADA Pull Request:

- [ ] **Secrets Management**: No hay credenciales hardcodeadas
- [ ] **Input Validation**: Todos los inputs externos están validados
- [ ] **Error Handling**: Try-catch apropiados, no se exponen stack traces
- [ ] **Resilience Patterns**: Implementa retry, circuit breaker o timeout
- [ ] **Logging**: No se loguean datos sensibles
- [ ] **Dependencies**: No hay paquetes con vulnerabilidades conocidas
- [ ] **Human Checks**: Existen comentarios `// ⚠️ HUMAN CHECK:` en lógica crítica

### 📝 Comentarios Centinela Obligatorios

En cada bloque de lógica compleja, agregar:

```javascript
// ⚠️ HUMAN CHECK:
// [Descripción de qué sugirió la IA]
// [Por qué se modificó o validó manualmente]
// [Consideraciones que la IA no tuvo en cuenta]
```

**Ubicaciones obligatorias:**
1. Configuración de conexiones (DB, RabbitMQ)
2. Lógica de reintentos y circuit breakers
3. Validación y sanitización de inputs
4. Manejo de errores críticos
5. Procesamiento de datos sensibles

---

## Herramientas IA Utilizadas

- **Editor Principal**: [Cursor/Windsurf/Otro]
- **Asistente de Código**: GitHub Copilot / Amazon Q
- **Validación de Seguridad**: [Herramienta específica]
- **Generación de Tests**: [Herramienta específica]

---

## Métricas de Éxito

- **Cobertura de Tests**: > 80%
- **Human Checks Documentados**: Mínimo 5 por microservicio
- **Vulnerabilidades Detectadas por QA**: 0 en producción
- **Anti-Patterns Documentados**: Mínimo 2 en README.md
- **Code Reviews Aprobados**: 100% con aprobación de par

---

## Evolución del Workflow

Este documento es **vivo** y debe actualizarse cuando:
- Se descubra un nuevo anti-pattern
- Se identifique una mejora en el prompting
- El QA encuentre un patrón recurrente de error de IA
- Se adopte una nueva herramienta o práctica

**Última actualización**: [Fecha]  
**Responsable**: [Nombre del equipo]
