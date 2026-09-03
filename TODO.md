# TODO

## Сборка `.d.ts` для всех `@soldy/*` пакетов

**Цель:** каждый пакет собирает собственные декларации типов, а UI-либы (`ui/vue` и др.) ссылаются на готовые типы, а не на исходники. Сейчас это сделано «в лоб» для `@soldy/ui-vue` через `preserveSymlinks` + `paths: {}` (см. `packages/ui/vue/tsconfig.lib.json`) — депсы при этом чек-аются как `.ts`-исходники.

### Текущее состояние
- Все `@soldy/*` пакеты — `private: true`, отдают исходники: `main`/`exports` → `./src/index.ts`.
- `@soldy/ui-vue`: `build:lib` (vite lib) + `build:types` (vue-tsc → `lib/*.d.ts`) работают.

### Что нужно сделать

1. **Каждому пакету — своя генерация типов.**
   - Чистые TS-пакеты (`core`, `plugins`, `setup`, `accessor`, `icons`) — обычный `tsc --emitDeclarationOnly`.
   - Пакеты с `.vue` (`ui/vue`, далее `ui/react` и т.д.) — `vue-tsc`.

2. **На каждый пакет:**
   - `tsconfig.build.json` с `emitDeclarationOnly: true`, `declaration: true`, `outDir: dist` (или `lib`), `rootDir: src`, `paths` указывают на собранные типы соседей, а не на исходники.
   - Скрипт `"build:types"` и `"build"` (или `build:lib`), который его запускает.
   - В `package.json` добавить `"types": "./dist/index.d.ts"` и переключить `exports` на собранный JS + типы (или добавить `exports["."].types`).

3. **Порядок сборки** (по графу зависимостей):
   - `core` → `icons` → `plugins`, `accessor` → `setup` → `ui/*`.
   - Можно оформить через TypeScript **project references** (`references` + `composite: true`) либо просто последовательными скриптами.

4. **Убрать «костыль» в `ui/vue`:**
   - Из `packages/ui/vue/tsconfig.lib.json` убрать `preserveSymlinks: true` и `paths: {}`.
   - Вместо этого резолвить `@soldy/*` на их собранные `*.d.ts` (через `types`/`exports` в node_modules).

5. **Публикация/потребление:**
   - `files` → только собранные `dist`/`lib`.
   - Для потребителей указать `types`, `exports` с `import`/`require` и `types`.

### Ссылки
- Пример текущей сборки Vue: `packages/ui/vue/vite.lib.config.ts`, `packages/ui/vue/tsconfig.lib.json`.
