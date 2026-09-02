# Рефакторинг Vue-компонентов: переход на Descriptor + Contribution

## Цель

Заменить ручное описание `emits`, `props`, `sync`-функций и `useComponentSetup` на декларативную систему на основе **Contribution** → **Descriptor** → **Adapter**.

---

## 1. Общая схема изменений

```
БЫЛО (старый подход):                      СТАЛО (новый подход):
─────────────────────────────────────      ──────────────────────────────────
Ручные emits:  [...events..., ...triggers]  useEmits(Descriptor) — авто
Ручные props:  { type, default }            useProps(Descriptor) — авто
Ручной sync:   emit/on/track/useSyncProps   useAdapter(Descriptor, props, emit)
Ручной bundle: useComponentSetup(...)       createBundle() внутри Дескриптора
Ручной state:  interface IState {}          Не нужен (refs из useAdapter)
```

---

## 2. Шаг 1: Создать Contribution (пакет `@soldy/setup`)

Файл: `packages/setup/contributions/components/{имя}.ts`

### Правила

| Концепт | Где описывать | Пример |
|---------|--------------|--------|
| Публичные свойства (видны пользователю) | `props[]` без `protected` | `{ name: 'rendered', triggers: ['change:rendered'] }` |
| Внутренние свойства (только для template) | `props[]` с `protected: true` | `{ name: 'present', protected: true, triggers: [...] }` |
| Триггеры свойств (change-события) | `triggers[]` внутри описания свойства | `triggers: ['change:rendered']` |
| События жизненного цикла (show, hide, etc.) | `events[]` — отдельно от triggers | `events: ['show', 'hide']` |

> **ВАЖНО:** Триггеры и события разделены. Триггеры (`change:*`) идут в `props[].triggers`, события (`show`, `hide`, `ready` и т.д.) — в `events[]`.

### Пример: Component (`packages/setup/contributions/components/component.ts`)

```ts
import type { IContribution } from '@soldy/accessor'

export const ComponentContribution: IContribution = {
    props: [
        { name: 'rendered', triggers: ['change:rendered'] },
        { name: 'visible', triggers: ['change:visible'] },
        { name: 'present', protected: true, triggers: ['change:rendered', 'change:visible'] },
    ],
    events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}
```

`present` — protected, потому что используется только внутри template (вычисляемое), не выставляется пользователю.

### Пример: Icon (`packages/setup/contributions/components/icon.ts`)

```ts
import type { IContribution } from '@soldy/accessor'

export const IconContribution: IContribution = {
    props: [
        { name: 'size', triggers: ['change:size'] },
        { name: 'width', triggers: ['change:width'] },
        { name: 'height', triggers: ['change:height'] },
    ],
}
```

### Пример: ComponentView (`packages/setup/contributions/components/component-view.ts`)

```ts
import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution: IContribution = {
    props: [
        { name: 'tag', triggers: ['change:tag'] },
        { name: 'classes', protected: true, triggers: ['change:classes'] },
    ],
    events: ['ready'],
}
```

`classes` — protected, потому что форматируется внутри и используется только в `:class`.

---

## 3. Шаг 2: Описать Contribution плагина (если его свойства используются в template)

Файл: `packages/setup/contributions/plugins/{имя}/`

### Когда нужен Contribution плагина?

**Нужен** — если свойство плагина используется в шаблоне Vue (`:style`, `:class`, `v-model` и т.д.).

**Не нужен** — если плагин только меняет внутреннее состояние (как `TReadyPlugin`), и его свойства не привязаны к шаблону.

### Как определить?

Смотри в старом коде, откуда берётся свойство в `sync`-функции:

```ts
// Старый sync Icon:
return {
    ...syncProps,
    ...useSyncProps(instance.events as any, {
        size: () => instance.size,    // ← из instance → компонентная contribution
        width: () => instance.width,  // ← из instance → компонентная contribution
    }),
    ...useSyncProps(iconPlugin.events as any, {
        styles: () => iconPlugin.styles, // ← из плагина → нужна plugin contribution!
    }),
}
```

И смотри в старом шаблоне:

```html
<component :style="styles">  <!-- свойство styles используется → плагин должен быть описан -->
```

### Пример: IconStyles (`packages/setup/contributions/plugins/icon/styles.ts`)

```ts
import type { IContribution } from '@soldy/accessor'

export const IconStylesContribution: IContribution = {
    props: [{ name: 'styles', protected: true, triggers: ['change:styles'] }],
}
```

`protected: true` — потому что `styles` вычисляется плагином, пользователь напрямую его не задаёт.

### Пример: элемент, instance, ready (НЕ требуют contribution)

`TElementPlugin` и `TInstancePlugin` имеют contribution только потому что выставляют события `ready`/`removed` наружу. `TReadyPlugin` не имеет — он только проставляет `instance.ready`.

---

## 4. Шаг 3: Создать Descriptor (пакет `@soldy/setup`)

Файл: `packages/setup/descriptors/components/{имя}.descriptor.ts`

### Шаблон

```ts
import { defineComponent, definePlugin } from '../base'
import { TComponentCtor } from '@soldy/core'
import { TPluginCtor } from '@soldy/plugins'
import { ComponentContribution, PluginContribution } from '../../contributions'
import { ParentDescriptor } from './parent.descriptor'

export const ComponentDescriptor = defineComponent({
    ctor: TComponentCtor,           // core-класс компонента

    extends: ParentDescriptor,      // родительский дескриптор (наследование props/events/plugins)

    contribution: ComponentContribution,  // своя контрибуция

    plugins: [
        definePlugin({
            ctor: TPluginWithTemplateProps,
            contribution: PluginContribution,  // ← если свойства плагина в template
        }),
        definePlugin({
            ctor: TPluginWithoutTemplateProps,
            // без contribution — свойства не используются в template
        }),
    ],
})
```

### Пример: Icon (`packages/setup/descriptors/components/icon.descriptor.ts`)

```ts
import { defineComponent, definePlugin } from '../base'
import { TIcon } from '@soldy/core'
import { TIconStylesPlugin } from '@soldy/plugins'
import { IconContribution, IconStylesContribution } from '../../contributions'
import { ComponentViewDescriptor } from './component-view.descriptor'

export const IconDescriptor = defineComponent({
    ctor: TIcon,

    extends: ComponentViewDescriptor,

    contribution: IconContribution,

    plugins: [
        definePlugin({
            ctor: TIconStylesPlugin,
            contribution: IconStylesContribution,  // ← styles используется в :style
        }),
    ],
})
```

### Цепочка наследования дескрипторов

```
EntityDescriptor        → ctrl, plugins
ComponentDescriptor     → extends: EntityDescriptor    + rendered, visible, present
ComponentViewDescriptor → extends: ComponentDescriptor + tag, classes + Element/Instance/Ready plugins
IconDescriptor          → extends: ComponentViewDescriptor + size, width, height + IconStyles plugin
```

---

## 5. Шаг 4: Обновить Vue-компонент

### `base.component.ts` — заменить ручные emits/props на useEmits/useProps

```ts
// БЫЛО:
export const emitsComponent: TEmits = [
    'created', 'rendered', 'update:rendered', 'change:rendered', ...
] as const

export const propsComponent: TProps = {
    ctrl: { type: Object as PropType<...> },
    rendered: { type: Boolean, default: ... },
    ...
}

// СТАЛО:
import { useEmits, useProps } from '../../adapter'
import { ComponentDescriptor } from '@soldy/setup'

export const emitsComponent: TEmits = useEmits(ComponentDescriptor) as unknown as TEmits
export const propsComponent: TProps = useProps(ComponentDescriptor) as TProps
```

### `setup.component.ts` — заменить useComponentSetup на useAdapter

```ts
// БЫЛО:
import { useComponentSetup } from '../../composables/useComponentSetup'

export default {
    setup(props, ctx) {
        return useComponentSetup({
            Ctor: TComponentView,
            plugins: () => createComponentViewBundle(),
            sync: (ctx) => syncComponentView(ctx),
        })(props, ctx)
    },
}

// СТАЛО:
import { useAdapter } from '../../adapter'
import { ComponentViewDescriptor } from '@soldy/setup'

export default {
    setup(props: TBaseComponentProps<IComponentViewProps, IComponentView>, { emit }: any) {
        return useAdapter(ComponentViewDescriptor, props, emit)
    },
}
```

### Удалить:

- `_base.component.ts` — старые sync-функции и state-интерфейсы больше не нужны. Если они ещё реэкспортируются, пометить как `@deprecated`.
- Ручные вызовы `track()`, `instance.events.on()`, `useSyncProps()` — всё это теперь делает `useAdapter` автоматически.

### Имена в шаблоне

После рефакторинга имена свойств в шаблоне могут измениться из-за `NamingStrategy`. Например:

```html
<!-- БЫЛО: -->
:style="styles"

<!-- СТАЛО (vueNaming: icon-styles:styles → iconStyles_styles): -->
:style="iconStyles_styles"
```

Имена генерируются стратегией `vueNaming` (`packages/ui/vue/src/adapter/naming.ts`):
- prop `name` + namespace `icon-styles` → `iconStyles_styles` (namespace в camelCase + `_` + name)
- event `ready` + namespace `element` → `element:ready`

---

## 6. Пошаговый алгоритм рефакторинга

Для каждого компонента (например, `button`, `input`, `tabs`, ...):

1. **Найди старый код**:
   - `packages/ui/vue/src/components/{name}/base.component.ts` — emits/props
   - `packages/ui/vue/src/components/{name}/setup.component.ts` — setup
   - `packages/ui/vue/src/components/{name}/*.vue` — шаблон

2. **Проанализируй старый `sync`**:
   - Какие свойства берутся из `instance`? → Это **компонентная contribution**
   - Какие свойства берутся из плагинов (`plugins.get(...)`)? → Это **plugin contribution**
   - Какие события emit'ятся наружу? → Это `events[]`
   - Какие свойства protected (только для template)? → `protected: true`

3. **Создай Contribution**:
   - `packages/setup/contributions/components/{name}.ts`
   - И если нужно: `packages/setup/contributions/plugins/{name}/...ts`

4. **Создай Descriptor**:
   - `packages/setup/descriptors/components/{name}.descriptor.ts`
   - Укажи `extends` (родительский дескриптор), `contribution`, `plugins`

5. **Обнови Vue-компонент**:
   - `base.component.ts`: `useEmits(Descriptor)` + `useProps(Descriptor)`
   - `setup.component.ts`: `useAdapter(Descriptor, props, emit)`
   - Шаблон: проверь имена свойств (могут измениться из-за naming strategy)

6. **Экспортируй**: добавь новый Contribution и Descriptor в `index.ts` соответствующих пакетов.

7. **Пометь старый код**: `_base.component.ts` → `@deprecated`.

---

## 7. Как определить, какие свойства protected?

| Ситуация | protected |
|----------|-----------|
| Свойство задаётся пользователем через prop | `false` (по умолчанию) |
| Свойство вычисляется внутри (present, classes, styles) | `true` |
| Свойство плагина, которое не должно быть доступно снаружи | `true` |

В старом коде protected-свойства можно найти в `useSyncProps(...)` — если свойства нет в `propsComponent`, но оно есть в `sync`-функции, значит оно protected.

---

## 8. Как определить, какой плагин требует Contribution?

1. Смотри старый `setup.component.ts` → `plugins: () => create...Bundle().use(TPlugin)`
2. Смотри старый `sync` → если плагин используется через `plugins.get(TPlugin)` и его свойства попадают в возвращаемый объект
3. Смотри старый шаблон → если свойство плагина используется в `:style`, `:class` и т.д.

Если хотя бы одно из условий выше выполняется — плагину нужна Contribution в `definePlugin`.

---

## 9. Именование файлов и экспорт

| Что | Где | Имя |
|-----|-----|-----|
| Contribution компонента | `packages/setup/contributions/components/` | `{name}.ts` |
| Contribution плагина | `packages/setup/contributions/plugins/{plugin}/` | `{feature}.ts` |
| Descriptor | `packages/setup/descriptors/components/` | `{name}.descriptor.ts` |

Экспортировать в `index.ts` соответствующей директории.
