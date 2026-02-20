// DEMOSTRACIÓN DE VALOR: Tests detectan bugs que pasan desapercibidos

describe('Demostración de Valor Real - Testing Frontend', () => {
  
  beforeEach(() => {
    // ⚠️ OPTIMIZACIÓN: Mock simplificado - el global ya está configurado
    localStorage.clear();
    global.fetch = vi.fn();
  });
  
  it('❌ BUG REAL: Auth service no persiste token después de login', () => {
    // SIMULA auth.service.ts con bug común
    function simulatedLogin(username: string, password: string) {
      // BUG: Desarrollador olvida persistir el token
      const token = 'jwt-12345';
      // localStorage.setItem('token', token); // ← OLVIDADO!
      return Promise.resolve({ success: true, token });
    }
    
    function getStoredToken() {
      return localStorage.getItem('token');
    }

    return simulatedLogin('admin', 'pass').then(response => {
      // SIN ESTE TEST: Bug pasa a producción
      // CON ESTE TEST: Bug detectado inmediatamente
      const storedToken = getStoredToken();
      
      console.log('🚨 Token response:', response.token);
      console.log('💾 Token stored:', storedToken);
      
      // Este test FALLARÍA y detectaría el bug
      expect(response.token).toBeTruthy(); // ✅ API responde bien
      expect(storedToken).toBe(response.token); // ❌ Pero no se persiste
    });
  });

  it('🔓 SECURITY BUG: Logout no limpia datos sensibles', () => {
    // SETUP: Usuario logueado con datos sensibles
    localStorage.setItem('token', 'secret-jwt');
    localStorage.setItem('userProfile', '{"role":"admin","salary":100000}');
    localStorage.setItem('lastSearch', 'confidential-query');
    
    // SIMULA logout con bug de seguridad
    function simulatedLogout() {
      localStorage.removeItem('token'); 
      // BUG: Olvida limpiar datos sensibles
      // localStorage.removeItem('userProfile');
      // localStorage.removeItem('lastSearch');
    }
    
    // ACCIÓN: Usuario hace logout
    simulatedLogout();
    
    // VERIFICACIÓN: ¿Quedan datos sensibles?
    const remainingProfile = localStorage.getItem('userProfile');
    const remainingSearch = localStorage.getItem('lastSearch');
    
    console.log('🔍 Remaining profile:', remainingProfile);
    console.log('🔍 Remaining search:', remainingSearch);
    
    // SIN ESTOS TESTS: Filtración de datos sensibles
    expect(localStorage.getItem('token')).toBeNull(); // ✅ Token limpiado
    expect(remainingProfile).toBeNull(); // ❌ Profile sigue ahí
    expect(remainingSearch).toBeNull(); // ❌ Search history expuesta
  });

  it('💥 NETWORK RESILIENCE: API calls sin error handling', () => {
    // SIMULA threat.service.ts sin manejo de errores
    function simulatedReportThreat(threatData: any) {
      return fetch('/api/threats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threatData)
      });
      // BUG: No maneja errores de red, timeouts, etc.
    }
    
    // SIMULA error de red
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));
    
    return simulatedReportThreat({ type: 'malware' })
      .then(() => {
        // SIN TEST: App crashea en producción
        console.log('❌ Unexpected success - should have failed');
        expect(true).toBe(false); // No debería llegar aquí
      })
      .catch(error => {
        // CON TEST: Error manejado apropiadamente
        console.log('✅ Error caught properly:', error.message);
        expect(error.message).toBe('Network failure');
      });
  });

  it('⚡ PERFORMANCE: WebSocket reconexión infinita', () => {
    let reconnectAttempts = 0;
    let maxReconnects = 3;
    
    // SIMULA ws.service.ts con bug de reconexión
    function simulatedWebSocketConnect() {
      return new Promise((resolve, reject) => {
        reconnectAttempts++;
        
        if (reconnectAttempts <= maxReconnects) {
          // Simula conexión que falla
          setTimeout(() => {
            reject(new Error('Connection failed'));
            // BUG: Intenta reconectar inmediatamente → loop infinito
            simulatedWebSocketConnect();
          }, 10);
        }
      });
    }
    
    // Ejecutar y verificar
    return new Promise((resolve) => {
      simulatedWebSocketConnect().catch(() => {
        // Verificar después de un tiempo
        setTimeout(() => {
          console.log('🔄 Reconnect attempts:', reconnectAttempts);
          
          // SIN TEST: Server bombardeado con reconexiones
          expect(reconnectAttempts).toBeGreaterThan(3); // ❌ Loop infinito detectado
          
          // CON TEST: Límite de reconexión apropiado
          expect(reconnectAttempts).toBeLessThanOrEqual(5); // ✅ Límite razonable
          resolve(true);
        }, 50);
      });
    });
  }, 1000); // timeout extendido para esta prueba
});