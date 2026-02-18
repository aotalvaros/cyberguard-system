# CyberGuard System - Style Guide

## 🎨 Paleta de Colores

### Colores Primarios
```css
--primary: #667eea;        /* Púrpura azulado */
--secondary: #764ba2;      /* Púrpura */
--gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

**Uso:**
- Headers, botones principales, links
- Gradiente en login y dashboard header
- Focus states en inputs

### Colores de Estado
```css
--success: #4caf50;        /* Verde */
--success-bg: #e8f5e9;     /* Verde claro */
--success-text: #2e7d32;   /* Verde oscuro */

--error: #f44336;          /* Rojo */
--error-bg: #ffebee;       /* Rojo claro */
--error-text: #c62828;     /* Rojo oscuro */

--warning: #ff9800;        /* Naranja */
--info: #2196f3;           /* Azul */
```

**Uso:**
- Mensajes de éxito/error
- Validaciones de formularios
- Alertas y notificaciones

### Colores de Severidad (Amenazas)
```css
--severity-low: #2196f3;      /* Azul */
--severity-medium: #ff9800;   /* Naranja */
--severity-high: #ff5722;     /* Naranja oscuro */
--severity-critical: #f44336; /* Rojo */
```

**Uso:**
- Border-left en alert cards
- Estadísticas de severidad
- Indicadores visuales

### Colores Neutros
```css
--background: #f5f5f5;     /* Gris claro */
--card-bg: #ffffff;        /* Blanco */
--text-primary: #333333;   /* Gris oscuro */
--text-secondary: #666666; /* Gris medio */
--text-muted: #999999;     /* Gris claro */
--border: #e0e0e0;         /* Gris muy claro */
```

**Uso:**
- Fondos de página y cards
- Textos y borders
- Estados disabled

---

## 📐 Tipografía

### Escala de Tamaños (Fluid Typography)
```css
/* Usando clamp() para responsive */
h1: clamp(1.5rem, 5vw, 2rem);      /* 24px - 32px */
h2: clamp(1.25rem, 4vw, 1.5rem);   /* 20px - 24px */
h3: clamp(1.1rem, 3.5vw, 1.25rem); /* 17.6px - 20px */
body: clamp(0.875rem, 3vw, 1rem);  /* 14px - 16px */
small: clamp(0.75rem, 2.5vw, 0.85rem); /* 12px - 13.6px */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--line-height-tight: 1.2;
--line-height-normal: 1.4;
--line-height-relaxed: 1.6;
```

---

## 📏 Espaciado

### Sistema de Espaciado
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
```

### Uso Común
- Gap entre elementos: 1rem
- Padding de cards: 1.5rem (desktop), 1rem (mobile)
- Margin entre secciones: 1.5rem - 2rem
- Gap en flex/grid: clamp(1rem, 2vw, 2rem)

---

## 🔲 Border Radius

```css
--radius-sm: 6px;   /* Inputs, botones */
--radius-md: 8px;   /* Stats bar, elementos medianos */
--radius-lg: 12px;  /* Cards, contenedores principales */
```

---

## 🌑 Sombras

```css
--shadow-card: 0 2px 10px rgba(0, 0, 0, 0.1);
--shadow-hover: 0 5px 15px rgba(102, 126, 234, 0.4);
--shadow-header: 0 2px 10px rgba(0, 0, 0, 0.1);
--shadow-login: 0 10px 40px rgba(0, 0, 0, 0.2);
```

---

## 🔘 Componentes

### Botones

#### Primary Button
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
color: white;
padding: 0.875rem;
border-radius: 6px;
font-weight: 600;
transition: transform 0.2s, box-shadow 0.2s;

/* Hover */
transform: translateY(-2px);
box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);

/* Disabled */
opacity: 0.6;
cursor: not-allowed;
```

#### Secondary Button (Logout)
```css
background: rgba(255, 255, 255, 0.2);
color: white;
border: 1px solid rgba(255, 255, 255, 0.3);
padding: 0.5rem 1rem;
border-radius: 6px;

/* Hover */
background: rgba(255, 255, 255, 0.3);
```

#### Danger Button (Clear)
```css
background: #f44336;
color: white;
padding: 0.5rem 1rem;
border-radius: 6px;

/* Hover */
background: #d32f2f;
```

#### Info Button (Export)
```css
background: #2196f3;
color: white;
padding: 0.5rem 1rem;
border-radius: 6px;

/* Hover */
background: #1976d2;
```

### Inputs

```css
width: 100%;
padding: 0.75rem;
border: 2px solid #e0e0e0;
border-radius: 6px;
font-size: clamp(0.875rem, 3vw, 1rem);
transition: border-color 0.3s;

/* Focus */
border-color: #667eea;
outline: none;

/* Error */
border-color: #f44336;
```

### Cards

```css
background: white;
border-radius: 12px;
padding: 1.5rem;
box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
```

### Alert Cards

```css
border-left: 4px solid [severity-color];
padding: 1rem;
border-radius: 6px;
background: #f9f9f9;
transition: transform 0.2s;

/* Hover */
transform: translateX(4px);

/* Critical */
background: #ffebee;
```

### Mensajes de Estado

#### Success
```css
background: #e8f5e9;
color: #2e7d32;
padding: 0.75rem;
border-radius: 6px;
```

#### Error
```css
background: #ffebee;
color: #c62828;
padding: 0.75rem;
border-radius: 6px;
```

---

## 📱 Breakpoints Responsive

```css
/* Mobile First Approach */

/* Extra Small Mobile */
@media (max-width: 360px) {
  /* Padding mínimo, card compacta */
}

/* Small Mobile */
@media (max-width: 480px) {
  /* 1 columna, botones full-width */
}

/* Mobile */
@media (max-width: 767px) {
  /* Layout vertical, formularios apilados */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  /* 2 columnas, espaciado optimizado */
}

/* Desktop */
@media (min-width: 1025px) {
  /* 3 columnas, layout completo */
}
```

---

## 🎯 Layouts Responsive

### Login Component
```css
/* Mobile (< 480px) */
.login-card {
  padding: 1rem;
  max-width: 100%;
}

/* Tablet/Desktop (> 480px) */
.login-card {
  padding: 2rem;
  max-width: 400px;
}
```

### Dashboard Component
```css
/* Mobile (< 768px) */
.form-row {
  grid-template-columns: 1fr;
}
.header-content {
  flex-direction: column;
}

/* Desktop (> 768px) */
.form-row {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
```

### Alerts Component
```css
/* Mobile (< 480px) */
.filters-bar {
  grid-template-columns: 1fr;
}
.pagination {
  flex-direction: column;
}

/* Desktop (> 768px) */
.filters-bar {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.alerts-list {
  max-height: 500px;
}
```

---

## ⚡ Transiciones y Animaciones

### Transiciones Estándar
```css
/* Botones */
transition: transform 0.2s, box-shadow 0.2s;

/* Inputs */
transition: border-color 0.3s;

/* Backgrounds */
transition: background 0.3s;

/* Colors */
transition: color 0.3s;
```

### Hover Effects
```css
/* Botones */
transform: translateY(-2px);
box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);

/* Alert Cards */
transform: translateX(4px);

/* Delete Button */
color: #f44336;
```

### Active States
```css
/* Botones */
transform: translateY(0) scale(0.98);
```

---

## ♿ Accesibilidad

### Contraste de Colores
- ✅ Texto principal (#333) sobre blanco: 12.63:1 (AAA)
- ✅ Texto secundario (#666) sobre blanco: 5.74:1 (AA)
- ✅ Botones primary: Contraste suficiente
- ✅ Mensajes de error: Alto contraste

### Focus States
```css
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #667eea;
  /* Border visible de 2px */
}
```

### Tamaños Mínimos
- Botones: min 44x44px (touch target)
- Texto: min 14px (legibilidad)
- Iconos: min 24x24px

### Semántica
- Labels asociados a inputs
- Mensajes de error descriptivos
- Estados disabled claros
- Alt text en imágenes (futuro)

---

## 🎨 Ejemplos de Uso

### Login Form
```html
<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>🛡️ CyberGuard</h1>
      <p>Sistema de Gestión de Amenazas</p>
    </div>
    <!-- Form content -->
  </div>
</div>
```

### Dashboard Header
```html
<header class="dashboard-header">
  <div class="header-content">
    <h1>🛡️ CyberGuard Dashboard</h1>
    <div class="user-info">
      <span>admin (admin)</span>
      <button class="btn-logout">Cerrar Sesión</button>
    </div>
  </div>
</header>
```

### Alert Card
```html
<div class="alert-card severity-critical">
  <div class="alert-header">
    <span class="alert-type">MALWARE</span>
    <button class="btn-delete">×</button>
  </div>
  <div class="alert-body">
    <p class="alert-description">Descripción de la amenaza</p>
    <div class="alert-details">
      <span>IP: 192.168.1.100</span>
      <span>Severidad: critical</span>
    </div>
    <div class="alert-time">Hace 2 minutos</div>
  </div>
</div>
```

---

## 📊 Grid System

### Auto-fit Grid
```css
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}
```

### Filters Bar
```css
.filters-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}
```

### Stats Bar
```css
.stats-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: space-around;
}
```

---

## 🔧 Utilidades CSS

### Truncate Text
```css
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### Word Break
```css
.word-break {
  word-break: break-word;
}
```

### Scroll Container
```css
.scroll-container {
  max-height: 500px;
  overflow-y: auto;
}
```

---

## 📝 Notas de Implementación

1. **Mobile First**: Todos los estilos parten de mobile y se expanden
2. **Fluid Typography**: Uso de clamp() para escalado automático
3. **Flexible Layouts**: Grid y flexbox con auto-fit/auto-fill
4. **Performance**: Transiciones solo en transform y opacity
5. **Consistencia**: Variables CSS para colores y espaciado (futuro)
6. **Accesibilidad**: WCAG AA compliant en contraste y tamaños
7. **Responsive**: 3 breakpoints principales (mobile, tablet, desktop)

---

## 🚀 Mejoras Futuras

- [ ] Implementar CSS Variables (custom properties)
- [ ] Dark mode support
- [ ] Animaciones más complejas con @keyframes
- [ ] Skeleton loaders para estados de carga
- [ ] Toast notifications component
- [ ] Modal/Dialog component
- [ ] Tooltip component
- [ ] Progress bar component
- [ ] Badge component
- [ ] Avatar component
