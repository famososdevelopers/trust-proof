# TrustProof 🛡️

**Plataforma centralizada de denuncias de estafadores para prevenir fraudes en transacciones entre particulares**

[![CI/CD Pipeline](https://github.com/famososdevelopers/trust-proof/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/famososdevelopers/trust-proof/actions)

---

## 🤖 Declaración de Uso de IA

Este proyecto ha sido desarrollado con la asistencia de herramientas de Inteligencia Artificial (Claude AI de Anthropic) y Lovable como parte del proceso de aprendizaje en el curso de Desarrollo de Software.

**¿Cómo usamos IA?**
- Configuración de CI/CD y testing
- Generación de código boilerplate
- Resolución de problemas técnicos
- Documentación

**¿Qué hicimos nosotros?**
- Diseño de la arquitectura
- Lógica de negocio y funcionalidades
- Decisiones de diseño UX/UI
- Validación y revisión del código

Creemos en la transparencia y en el uso ético de la IA como herramienta de apoyo al aprendizaje.

---

## 🛠️ Tecnologías

### Frontend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 18.3.1 | UI Library |
| Vite | 5.4.19 | Build Tool |
| TypeScript | 5.8.3 | Type Safety |
| Tailwind CSS | 3.4.17 | Styling |
| Zustand | 5.0.8 | State Management |
| React Router | 6.30.1 | Routing |
| Shadcn/ui | Latest | UI Components |

### Backend
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Supabase | 2.75.0 | Backend as a Service |
| PostgreSQL | 16 | Database |

### Testing & CI/CD
| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Vitest | 2.1.9 | Test Framework |
| Testing Library | 16.1.0 | Component Testing |
| Zod | 3.25.76 | Schema Validation |
| GitHub Actions | Latest | CI/CD |
| Vercel | Latest | Deploy & Hosting |

---

## 🚀 Instalación

```bash
# Clonar repositorio
git clone https://github.com/famososdevelopers/trust-proof.git
cd trust-proof

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env.local con:
# VITE_SUPABASE_URL=tu_url
# VITE_SUPABASE_ANON_KEY=tu_key

# Iniciar desarrollo
npm run dev
```

---

## 📝 Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm test             # Ejecutar tests
npm run lint         # Linter
```
