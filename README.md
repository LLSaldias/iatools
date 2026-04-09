# ls-framework

Framework agéntico y repositorio de librerías para desarrollo con IA.

## 🤖 El Framework Agéntico

Este repositorio implementa un entorno de trabajo basado en **Spec-Driven Development (SDD)**, utilizando agentes de IA para acelerar el desarrollo siguiendo estándares de arquitectura rigurosos.

### 🛠️ Herramienta CLI: `iatools`

La herramienta central es `@lsframework/iatools`, que permite inicializar y gestionar el entorno agéntico en cualquier proyecto.

Se recomienda ejecutarla directamente mediante `bunx` para asegurar el uso de la última versión:

```bash
bunx @lsframework/iatools init
```

#### Operaciones Principales

-   **`iatools init`**: Inicia un asistente interactivo para configurar el framework. Instala los agentes, las habilidades y los flujos de trabajo necesarios según tu rol e IDE.
-   **`iatools update`**: Refresca las habilidades y flujos de trabajo desde las plantillas más recientes, manteniendo tu entorno actualizado.
-   **`iatools skills add <url> --skill <id>`**: Permite instalar habilidades externas desde repositorios de GitHub.
-   **`iatools memory export`**: Exporta el grafo de conocimiento de `.sdd/memory.db` a `.sdd/memory.json` para Git.

---

### 🚀 Ciclo de Trabajo: SDD (Spec-Driven Development)

El flujo de trabajo SDD permite que los agentes implementen cambios basándose en especificaciones técnicas. Los comandos se ejecutan mediante "slash commands" en el chat del agente:

1.  **`/sdd-new <nombre-del-cambio>`**: Inicia un nuevo cambio, creando la estructura en `openspec/changes/`.
2.  **`/sdd-ff` (Fast-Forward)**: Genera automáticamente los artefactos de planificación (propuesta, especificaciones, diseño y tareas).
3.  **`/sdd-apply`**: Implementa las tareas una a una, escribiendo el código necesario.
4.  **`/sdd-verify`**: Valida la implementación contra las especificaciones y el diseño.
5.  **`/sdd-archive`**: Archiva el cambio completado, integrando las especificaciones en la "source of truth".

---

### ⏸️ Human Layers y Handoff

A medida que las tareas agénticas se vuelven más complejas, es posible que el agente necesite pausar, delegar contexto a un humano u otro agente, y luego continuar. Para esto, el framework provee habilidades nativas:

1. **`/create-handoff`**: Instruye al agente para crear un documento de "handoff" consolidado (estado, cambios, pendientes y bloqueos).
2. **`/iterate-plan`**: Permite iterar sobre planes de implementación existentes con investigación y validación.
3. **Reanudación**: Para continuar el trabajo, inicia una nueva sesión y menciona el archivo de handoff generado (ej. *"Lee handoffs/archivo.md y continuemos"*).

---

## 🏗️ Estructura del Proyecto

```
.
├── openspec/           # Especificaciones del sistema (Source of Truth)
│   ├── specs/          # Arquitectura, API, persistencia, etc.
│   └── changes/        # Historial de cambios realizados mediante SDD
├── .agents/            # Configuración de agentes, habilidades y flujos
└── packages/           # Librerías del monorepo (Lerna)
    └── iatools/        # CLI de SDD framework
```

## 📦 Stack Tecnológico

-   **Runtime**: [Node.js 20.x](https://nodejs.org/docs/latest-v20.x/api/) + [TypeScript](https://www.typescriptlang.org/docs)
-   **Package Manager**: [Bun](https://bun.sh/)
-   **Gestión de Monorepo**: [Lerna](https://lerna.js.org/) (modo `independent`)

---

## 🧑‍💻 Desarrollo Local

### Requisitos Previos

```bash
node -v   # >= 20.x (ver .nvmrc)
nvm use   # si usás nvm
```

### Instalación

```bash
# Clonar e instalar dependencias (workspaces)
git clone <repo-url>
cd ls-framework
bun install
```

### Compilar

```bash
# Compilar todos los paquetes del monorepo
bun run compile

# Compilar solo iatools
cd packages/iatools && bun run compile
```

### Tests

```bash
# Ejecutar todos los tests
bun run test

# Solo iatools
cd packages/iatools && bun run test
```

### Lint

```bash
bun run lint        # Ver errores
bun run fix         # Auto-fix
```

---

## 🔄 Actualizar Versión y Probar Localmente

### 1. Bump de versión con Lerna

El monorepo usa versionado `independent`, cada paquete tiene su propia versión.

```bash
# Interactivo — selecciona paquetes y tipo de bump (patch/minor/major)
npx lerna version --no-push

# Bump específico de iatools
npx lerna version --scope=@lsframework/iatools --no-push
```

> Esto actualiza `package.json`, crea un commit y un tag de Git.

### 2. Bump manual (sin Lerna)

Editar directamente `packages/iatools/package.json`:

```json
{
  "version": "1.4.0"  // ← cambiar la versión aquí
}
```

### 3. Instalar localmente para probar

Después de compilar, podés instalar `iatools` globalmente desde tu copia local:

```bash
# Compilar iatools
cd packages/iatools
npm run compile

# Opción A: Link global (desarrollo activo, refleja cambios al recompilar)
npm link
iatools --help

# Opción B: Instalar el .tgz (simula instalación real de npm)
npm pack                           # genera lsframework-iatools-X.X.X.tgz
npm install -g ./lsframework-iatools-*.tgz
iatools --help
```

### 4. Probar en un proyecto destino

```bash
# Con link (Opción A)
cd /ruta/al/proyecto-destino
npm link @lsframework/iatools
bunx iatools init

# Con bunx apuntando al local (sin instalar)
cd packages/iatools && bun run compile
cd /ruta/al/proyecto-destino
bunx --prefix /ruta/a/ls-framework/packages/iatools iatools init
```

### 5. Deshacer el link

```bash
npm unlink -g @lsframework/iatools
```

---

## 📋 Generación de un Release

Recomendamos utilizar el esquema de [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/).

1.  Crear branch `release-X.X.X` desde `integration`.
2.  Ejecutar `lerna version` para actualizar versiones y crear tags.
3.  Mergear contra `integration` y `master`.
4.  El pipeline de GitLab en `master` publicará automáticamente los paquetes.

---

# Copyright
Copyright (c) Lucas Saldias.