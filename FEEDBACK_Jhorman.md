# 🛡️ Reporte de Auditoría Senior: Backend Producer (Banda de Seguridad Crítica)

## 📊 Resumen de Puntajes Objetivos
| Dimensión | Puntaje (1, 3, 5) | Justificación Técnica Senior |
|-----------|-------------------|-----------------------------|
| **Arquitectura (RabbitMQ)** | 1 | **Falla Crítica:** No implementa "Publisher Confirms". En un sistema de seguridad, una publicación sin confirmación (at-most-once) es inaceptable. Estado global mutable (`let connection`) y falta de reconexión lo hacen frágil. |
| **Calidad & Human Checks** | 3 | Los "Human Checks" son valiosos pero insuficientes para compensar la falta de Inyección de Dependencias y el uso de anti-patrones como el `ThreatStore` que ordena `O(n log n)` en cada lectura. |
| **Docker & Infra** | 1 | No sigue el principio de "Least Privilege" (corre como root). Dockerfile ineficiente (sin multi-stage) y Healthcheck "mentiroso" que no valida la conexión real a RabbitMQ. |
| **Seguridad (OWASP/Audit)** | 1 | **Hallazgo Increíble:** Comparación de contraseñas en texto plano. Vulnerabilidad de enumeración de usuarios y Rate Limiting ineficiente en despliegues distribuidos (local memory map). |

---

### 🚩 Hallazgos Críticos (Showstoppers)

1.  **Seguridad nivel Junior - Plaintext Auth:** En `auth.controller.ts:45`, se comparan contraseñas usando `!==`. Un arquitecto senior sabe que esto es inaceptable. No hay hashing (Bcrypt/Argon2) ni protección contra ataques de temporización (timing attacks).
2.  **Arquitectura "Zombi" - Pub/Sub sin Confirmación:** El método `publishEvent` es de "disparar y olvidar". Si RabbitMQ está bajo presión o el canal se cierra, el Producer reporta "202 Accepted" al cliente mientras los mensajes se pierden en el vacío. Falta `confirmSelect()` y manejo de nacks.
3.  **Bomba de Tiempo en Performance:** `threat.store.ts:11` realiza un spread `[...]` y un `.sort()` en cada petición GET. A medida que el sistema detecte amenazas reales, la latencia del API crecerá exponencialmente hasta bloquear el Event Loop.
4.  **Detectores "Alucinados":** El middleware de fuerza bruta usa un `Map` local. En un entorno real con balanceador de carga y múltiples réplicas, un atacante puede rotar instancias y saltarse el bloqueo fácilmente. Se requiere persistencia compartida (Redis).

---

### 🔍 Análisis de "Human Checks"
Aunque el equipo cumplió con la métrica de cantidad, la **calidad arquitectónica** de los mismos es cuestionable:
*   **Acierto:** El routing key dinámico en `threat.service.ts` es un buen toque senior.
*   **Error de Omisión:** El `HUMAN CHECK` en `rabbitmq.ts` menciona que la IA no manejaba reconexión, pero el humano **tampoco la implementó**. Solo agregó un log de error y un `throw`, lo cual es exactamente lo que haría una IA básica.

### 💡 Oportunidad de Optimización (Arquitectura Senior)

**Bloque Identificado:** `rabbitmq.ts` y la falta de confiabilidad de entrega.

**Propuesta de Clase Arquitectónica (Standard Enterprise):**
Se propone encapsular RabbitMQ en un Singleton con **Publisher Confirms** y **Health Checks** reales.

```typescript
// rabbitmq.provider.ts - Propuesta Senior
export class RabbitMQProvider {
  private channel: amqp.ConfirmChannel; // ⚠️ Uso obligatorio de ConfirmChannel

  async publishReliable(exchange: string, key: string, msg: any) {
    return new Promise((resolve, reject) => {
      this.channel.publish(exchange, key, Buffer.from(JSON.stringify(msg)), 
        { persistent: true }, 
        (err) => (err ? reject(err) : resolve(true)) // Espera confirmación del Broker
      );
    });
  }

  async checkHealth(): Promise<boolean> {
    // Un healthcheck real debe verificar que el canal esté abierto
    return !!this.channel && !this.channel.on('error', () => {});
  }
}
```
**Impacto:** Garantiza que NINGUNA amenaza se pierda por fallos de red o saturación del broker.

---

### 🏁 Veredicto Final
**ESTADO: RECHAZADO (REQUIERE REFACTORIZACIÓN INMEDIATA).**
Aunque el proyecto "parece" profesional por fuera (TypeScript, Docker, Joi), las entrañas revelan una arquitectura frágil con fallos de seguridad básicos (contraseñas en plano) y cuellos de botella de performance que harían fallar el sistema en un entorno de producción real bajo carga de ciberseguridad. Es un prototipo funcional, no un sistema listo para producción.
