# Soldy — статус миграции

Дата: 2026-07-09. Миграция из `soldatov-kit` (монолит) в `soldy` (npm workspaces).

## Структура

```
soldy/
├── package.json              # workspaces: ["packages/*", "packages/ui/*"]
├── tsconfig.base.json
├── packages/
│   ├── core/                 # @soldy/core — бизнес-логика (перенесён)
│   ├── foundation/           # @soldy/foundation — Tailwind 4, темы, стили (перенесён)
│   ├── icons/                # @soldy/icons — SVG-иконки (перенесён)
│   ├── plugins/              # @soldy/plugins — плагины (перенесён)
│   └── ui/
│       ├── vue/              # @soldy/ui-vue — ✅ запущен, демка работает
│       ├── react/            # ⏳ заглушка
│       ├── angular/          # ⏳ заглушка
│       ├── svelte/           # ⏳ заглушка
│       └── solid/            # ⏳ заглушка
```

## Что сделано

- Все старые импорты `@core`/`@plugins`/`@foundation`/`@icons` заменены на `@soldy/*`
- `vite.config.ts` в `packages/ui/vue/` с алиасами, `root: 'demo'`
- SCSS: `additionalData` вставляет `@import` Tailwind после всех `@use` (функция в `vite.config.ts`)
- Иконки: `useIconImport` переписан на `import.meta.glob('../../../../../icons/src/*.svg')`
- `@soldy/foundation/tailwind` — отдельный alias в vite.config.ts (перед общим `@soldy/foundation`)
- `plugins/package.json` — `exports: { ".": "./src/index.ts", "./*": "./src/*" }`
- `core/src/bridge/index.ts` — добавлен `export * from './../common/state-unit'` для VLS
- Зависимости (`sass`, `postcss`, `tailwindcss`, `@tailwindcss/postcss`) в `packages/ui/vue/package.json`
- `vite`, `@vitejs/plugin-vue`, `vite-svg-loader` — в корневом `package.json` (один экземпляр)

## Нерешённые проблемы

- **Иконки не отображаются** — `import.meta.glob` матчится, но `defineAsyncComponent` не рендерит SVG. Нужно отладить.
- **Красные подчёркивания в `<script lang="ts">`** — ошибка VLS про `TStateUnitValueEvents`. Добавлен экспорт в bridge, но VLS нужно перезагрузить (Reload Window).

## Команды

```bash
npm run dev:vue     # запуск демки Vue
npm run dev:react   # (заглушка)
npm run test:core   # (пока нет скрипта)
npm run test:vue    # (пока нет скрипта)
```

## Важные детали

- Имена пакетов: `@soldy/*` (не `@soldy` на npm — scope занят, нужно решить)
- npm (не pnpm) — протокол `workspace:*` не поддерживается, используется `*`
- Симлинки в `node_modules/@soldy/` → соответствующие `packages/*`
- Vite `root: 'demo'` в `packages/ui/vue/vite.config.ts`
