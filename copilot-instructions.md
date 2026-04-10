# Copilot Instructions - LS Framework Monorepo

## Contexto del Proyecto
Este es un monorepo gestionado con **Lerna** y **Bun**, con **TypeScript**, **Jest** y **Workspaces**. El proyecto permite gestionar múltiples paquetes de forma independiente dentro de un único repositorio.

## Reglas de Desarrollo

### 1. Estructura de Archivos y Carpetas
- **NUNCA** crear archivos fuera de la estructura `packages/*`
- Cada nuevo paquete debe seguir la estructura estándar:
  ```
  packages/
  ├── nombre-paquete/
  │   ├── src/
  │   │   └── index.ts
  │   ├── test/
  │   │   └── unit/
  │   │       └── *.test.ts
  │   ├── package.json
  │   ├── tsconfig.json
  │   ├── jest.config.js
  │   └── CHANGELOG.md
  ```
- Los módulos compartidos van en `packages/sharedModules/`

### 2. Convenciones de Naming
- **Nombres de paquetes**: Usar el formato `@lsframework/{package-name}` en package.json
- **Archivos**: Usar kebab-case para nombres de archivos (`my-module.ts`)
- **Clases y interfaces**: PascalCase (`MyClass`, `IMyInterface`)
- **Funciones y variables**: camelCase (`myFunction`, `myVariable`)
- **Constantes**: UPPER_SNAKE_CASE (`MY_CONSTANT`)

### 3. Package.json Rules
- **SIEMPRE** incluir estos scripts obligatorios en cada paquete:
  ```json
  {
    "scripts": {
      "compile": "tsc",
      "test": "jest --detectOpenHandles",
      "coverage": "jest --coverage --detectOpenHandles",
      "lint": "eslint ./src ./test",
      "fix": "eslint --fix ./src ./test",
      "dependency-check": "depcheck ."
    }
  }
  ```
- Configurar correctamente `main`, `typings`, `files` y `directories`
- Usar versionado independiente (no cambiar a `fixed` mode)

### 4. TypeScript Configuration
- **NUNCA** modificar el `tsconfig.json` raíz sin justificación
- Extender siempre del tsconfig raíz en paquetes individuales
- Mantener `target: "ES2021"` y `module: "CommonJS"`
- **SIEMPRE** habilitar `strict: true`

### 5. Configuration Files Review
- **SIEMPRE** revisar archivos de configuración antes de hacer cambios:
  - `.eslintrc.js` o configuración ESLint
  - `.prettierrc` o configuración Prettier
  - `jest.config.js` en cada paquete
  - `tsconfig.json` tanto raíz como de paquetes
- Validar que las configuraciones sean consistentes entre paquetes
- No modificar configuraciones sin entender el impacto en todo el monorepo

### 6. Code Documentation Rules
- **PROHIBIDO** escribir comentarios inline en el código (// comentarios)
- **ÚNICAMENTE** usar JSDoc para documentación:
  ```typescript
  /**
   * Descripción de la función
   * @param param1 Descripción del parámetro
   * @returns Descripción del valor de retorno
   * @example
   * ```typescript
   * const result = myFunction('example');
   * ```
   */
  function myFunction(param1: string): string {
    return param1.toUpperCase();
  }
  ```
- JSDoc obligatorio para todas las funciones y clases públicas
- Incluir ejemplos de uso cuando sea relevante

### 7. Testing Rules
- **OBLIGATORIO** escribir tests para toda función pública
- Tests unitarios en `test/unit/`
- Usar la configuración Jest predefinida
- **Coverage obligatorio**: 80% por paquete - NO negociable
- Nombrar archivos de test: `*.test.ts`
- **SIEMPRE consultar** antes de implementar tests: ¿Prefieres que sea TDD (Test-Driven Development)?

### 8. Comandos y Scripts
#### Comandos a nivel raíz (desde la carpeta principal):
```bash
npm install          # Instalar todas las dependencias
npm run compile      # Compilar todos los paquetes
npm run test         # Ejecutar tests de todos los paquetes
npm run lint         # Linter en todos los paquetes
npm run clean        # Limpiar builds anteriores
```

#### Para trabajar en un paquete específico:
```bash
cd packages/{nombre-paquete}
npm run compile
npm run test
```

### 9. Dependency Management
- **NUNCA** instalar dependencias directamente en paquetes individuales
- Las devDependencies comunes van en el package.json raíz
- **SIEMPRE** ejecutar `npm run dependency-check` antes de commit

### 10. Import/Export Patterns
#### Para importar entre paquetes del monorepo:
```typescript
import { myFunction } from '@lsframework/other-package';
import { sharedUtil } from '@lsframework/sharedModules';
```

#### Para exportar desde un paquete:
```typescript
// src/index.ts
export { MyClass } from './my-class';
export { myFunction } from './my-function';
export type { MyInterface } from './types';
```

### 11. Git y Versionado
- Seguir **Branching Strategy** definido
- **NUNCA** hacer commit sin pasar: lint, tests, dependency-check, security-check
- Los commits deben ser específicos por paquete cuando sea posible
- Usar conventional commits: `feat(package-name): description`

### 12. Security y Quality
- **OBLIGATORIO** ejecutar `npm run security-check` antes de release
- No usar dependencias no auditadas
- Mantener las dependencias actualizadas
- Seguir las reglas de ESLint sin excepciones

### 13. Publicación
#### Testing local antes de publicar:
```bash
npm run build
cd packages/{package-name}
npm pack --pack-destination ~
```

#### Publicación oficial:
- Usar `npm run publish-artifacts` desde la raíz
- Solo desde ramas autorizadas según branching strategy
- **NUNCA** publicar manualmente paquetes individuales

### 14. Shared Modules Best Practices
- Colocar utilidades comunes en `packages/sharedModules/`
- Evitar dependencias circulares entre paquetes
- Documentar claramente las APIs públicas
- Mantener backward compatibility en shared modules

### 15. Prohibiciones Importantes
❌ **NO HACER**:
- Modificar `lerna.json` sin aprobación
- Cambiar la configuración de workspaces
- Instalar dependencias globalmente en paquetes
- Hacer bypass de pre-commit hooks
- Usar `any` type sin justificación documentada
- Crear paquetes fuera de `packages/`
- Modificar scripts de CI/CD sin revisión
- Escribir comentarios inline (// comentarios) - Solo JSDoc permitido

### 16. Code Review Checklist
Antes de aprobar un PR, verificar:
- [ ] Tests pasan en todos los paquetes afectados
- [ ] Linter pasa sin errores
- [ ] Coverage mantiene el 80% obligatorio
- [ ] Dependency check pasa
- [ ] Security check pasa
- [ ] Configuraciones revisadas (ESLint, Prettier, Jest, TSConfig)
- [ ] Solo JSDoc usado para documentación (no comentarios inline)
- [ ] Documentación actualizada si es necesario
- [ ] Changelog actualizado en paquetes modificados

### 17. Performance y Optimización
- Aprovechar el hoisting de dependencias de workspaces
- Usar `lerna run --parallel` para comandos que lo soporten
- Mantener builds incremental cuando sea posible
- Evitar duplicación de código entre paquetes

---

**Recuerda**: Este template está diseñado para facilitar el desarrollo colaborativo y la gestión de múltiples paquetes. Seguir estas reglas garantiza consistencia, calidad y mantenibilidad del proyecto.
