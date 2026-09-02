# AGENTS.md

Guidance for AI coding agents working in the **soldy** monorepo.

## What this is

A headless UI component framework. Core business logic is **framework-agnostic**; each UI framework (Vue, React, Angular, Solid, Svelte) is a thin adapter package. Components are described by build-time metadata (descriptors) and wired to a framework at runtime through an adapter context.

## Commands

```bash
npm run dev:vue      # Vue demo (Vite)
npm run dev:react    # React demo
npm run test:core    # Vitest — @soldy/core
npm run test:setup   # Vitest — @soldy/setup
npm run test:accessor
npm run test:plugins
npm run test:vue
npm run lint         # ESLint (auto-fix)
npm run format       # Prettier
```

- Node `^20.19.0 || >=22.12.0`, TypeScript 6 in **strict** mode, ESLint 10, Vitest 3, Vite 6.
- npm workspaces: `packages/*` and `packages/ui/*`.

## Layer boundaries (critical)

| Package | Responsibility |
|---|---|
| `packages/core` | Headless, framework-agnostic component models (`TEntity`, `TComponent`, `TCollectionEngine`, collection facades, extensions). |
| `packages/accessor` | Runtime reflection (`TComponentAccessor`, `TDescriptorInspector`). |
| `packages/setup` | Build-time metadata: `contributions/`, `descriptors/`, `adapter/`. |
| `packages/plugins` | Runtime behavior extenders installed into `TPluginBundle`. |
| `packages/ui/*` | Framework adapters — the **only** place framework imports are allowed. |

**Rule:** `core`, `accessor`, `setup`, and `plugins` must **not** import `vue`, `react`, `solid`, `svelte`, `@angular/*`, `Ref`, or `PropType`. Framework-specific code belongs only in `packages/ui/*`.

## Naming conventions

- `T` prefix → type alias (e.g. `TCollectionEngine<TItem, TExtensions>`).
- `I` prefix → interface (e.g. `IComponent`, `IExtension`).
- Expose collection state through **facade getters** (`TCollectionComponent` / `TCollectionItemComponent` subclasses) — do not intersect separate input/output interfaces.

## Project-specific patterns

- **Contributions** are arrow-function factories returning an `IContribution` dictionary:
  ```ts
  export const ButtonContribution = (): IContribution => ({
    props: { view: { type: String, triggers: ['change:view'] } },
    events: ['click'],
  })
  ```
  `props` is a `Record<string, IPropDefinition>` — the prop name is the dictionary key, not a field.

- **Descriptors** are arrow-function factories too. Call them when used as `extends` / options (do not pass the function reference):
  ```ts
  export const ButtonDescriptor = () => defineComponent({ extends: TextableDescriptor(), ... })
  ```

- **Types live in `types.ts`**: type aliases and interfaces (`T*`, `I*`, `*Options`, `*Props`) belong in a `types.ts` file, never alongside the class implementation. Example: `TListCollectionFacadeOptions` lives in `collection/types.ts`, while `facade.ts` holds only the `TListCollectionFacade` class.

- **Branded prop types**: use `defineType<T>(ctor)` from `@soldy/setup` for phantom-typed contribution props (e.g. `defineType<TSelectionMode>(String)`).

- **Collections use facades**: the owner is a `TCollectionComponent` subclass (e.g. `TTabsCollectionFacade`) that owns a `TCollectionEngine` and exposes getters (`items`, `trackBy`, `activeItem`); the item is a `TCollectionItemComponent` subclass (e.g. `TTabItemCollectionFacade`) holding a `TItemContext`. Both are wired through `defineComponent` descriptors — there is no `defineCollection`/`defineExtension`.

- **Vue collection setup** creates two adapter contexts sharing one bundle: the owner component (`TabsDescriptor`) and the collection facade (`TabsCollectionDescriptor`, `{ bundle: adapter.bundle, defaultExtensions: [] }`), calls `useVue` on each and merges `{ ...refs, ...refsCollection }`. Items register through `TCollectionExtension`/`TCollectionItemExtension` over the elevator (provide/inject).

## Pitfalls

- `vue-tsc` requires exported, named types for portability. Use `ReadonlyArray<T>` instead of intersection types like `ReadonlyArray<T> & ICollectionStorageDriver<T>` when a type may leak into inferred types.
- `packages/setup/descriptors/base/compile-contribution.ts` exports `normalizeContribution` (not `compileContribution`) — check imports in specs that reference it.
- Tailwind `@apply` directives in `.vue` `<style>` blocks may produce CSS-parser warnings — pre-existing, not a code error.

## Docs

- `packages/ui/vue/demo/README.md` — Vue playground structure and usage.
