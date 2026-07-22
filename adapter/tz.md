Из диалога:

"Принято, вы абсолютно правы — это усложнение на ровном месте. Добавление спец-терминов (`fullName`, `targetKey`, `'main'`) и костыльных проверок `if (namespace === 'main')` полностью ломает лаконичность архитектуры.

Если возвращаться к исходной идейной простоте: **`namespace` — это просто строка, которая либо есть, либо ее нет (`undefined`)**.

Никаких искусственных ключей, никаких суррогатных названий. Ниже представлен чистый, прямолинейный код без раздувания типов.

---

## 1. Слой Provide (`@soldy/accessor`)

Этот слой не знает ни про какие `core`/`plugins`. Он принимает исходные `IContribution` (где у плагина может быть передан `namespace`, а у компонента — нет), а также объект с экземплярами и дает унифицированный интерфейс взаимодействия.

#### `packages/provider/src/types.ts`

```typescript
export interface IPropContribution {
	name: string
	protected?: boolean
	triggers?: string[]
}

export interface IContribution {
	props?: IPropContribution[]
	events?: string[]
}

/** Описание скомпилированного элемента (prop/event) с опциональным namespace */
export interface ICompiledItem {
	name: string
	namespace?: string
}

export interface ICompiledProp extends ICompiledItem {
	protected: boolean
	triggers: string[]
}

export interface ICompiledEvent extends ICompiledItem {}

```

#### `packages/provider/src/accessor.ts`

```typescript
import type { ICompiledProp, ICompiledEvent } from './types'

export class ComponentAccessor {
	constructor(
		private props: ICompiledProp[],
		private events: ICompiledEvent[],
		private instance: any,
		private pluginsMap: Map<string, any>, // Карта плагинов по namespace (например: 'element' -> TElementPlugin)
	) {}

	/** Получить объект-источник по namespace (если namespace нет, то это сама модель core) */
	private getTarget(namespace?: string): any {
		return namespace ? this.pluginsMap.get(namespace) : this.instance
	}

	getProps(includeProtected = false): ICompiledProp[] {
		if (includeProtected) return this.props
		return this.props.filter((p) => !p.protected)
	}

	getEvents(): ICompiledEvent[] {
		return this.events
	}

	/** Вычисляет итоговый ключ для Vue/React: 'ready' или 'element:ready' */
	getExportName(item: ICompiledItem): string {
		return item.namespace ? `${item.namespace}:${item.name}` : item.name
	}

	getTriggers(prop: ICompiledProp): string[] {
		return prop.triggers
	}

	getEventSource(item: ICompiledItem): any {
		const target = this.getTarget(item.namespace)
		return target?.events ?? target
	}

	getValue(prop: ICompiledProp): any {
		const target = this.getTarget(prop.namespace)
		return target ? target[prop.name] : undefined
	}

	setValue(prop: ICompiledProp, value: any): void {
		if (prop.protected) return
		const target = this.getTarget(prop.namespace)
		if (target && prop.name in target) {
			target[prop.name] = value
		}
	}
}

```

---

## 2. Слой Setup (`@soldy/setup`)

Здесь мы просто собираем описания и пробрасываем `namespace` от плагинов без каких-либо `if ('main')`.

#### `packages/setup/src/descriptors/define-component.ts`

```typescript
import { TPluginBundle } from '@soldy/plugins'
import { ComponentAccessor, type IContribution, type ICompiledProp, type ICompiledEvent } from '@soldy/accessor'
import type { IPluginDefinition, IComponentDefinitionOptions, IComponentDescriptor } from './types'

function compileContribution(
	contribution?: IContribution,
	namespace?: string,
): { props: ICompiledProp[]; events: ICompiledEvent[] } {
	if (!contribution) return { props: [], events: [] }

	const props: ICompiledProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		protected: !!p.protected,
		triggers: p.triggers ?? [],
		namespace,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
		name,
		namespace,
	}))

	return { props, events }
}

export function definePlugin(options: { ctor: any; contribution?: IContribution }): IPluginDefinition {
	const key: symbol = options.ctor.key
	// Namespace просто берём из ключевого символа плагина
	const namespace = key.description || String(key).replace(/^Symbol\((.*)\)$/, '$1')

	return {
		ctor: options.ctor,
		contribution: options.contribution,
		key,
		namespace,
	}
}

export function defineComponent(options: IComponentDefinitionOptions): IComponentDescriptor {
	const parent = options.extends

	const plugins = [...(parent?.plugins ?? []), ...(options.plugins ?? [])]

	// 1. Компонент (без namespace)
	const own = compileContribution(options.contribution)

	// 2. Плагины (с namespace)
	const pluginContributions = (options.plugins ?? []).map((plugin) =>
		compileContribution(plugin.contribution, plugin.namespace),
	)

	const props: ICompiledProp[] = [
		...(parent?.props ?? []),
		...own.props,
		...pluginContributions.flatMap((c) => c.props),
	]

	const events: ICompiledEvent[] = [
		...(parent?.events ?? []),
		...own.events,
		...pluginContributions.flatMap((c) => c.events),
	]

	return {
		ctor: options.ctor ?? parent?.ctor ?? Object,
		props,
		events,
		plugins,

		createBundle() {
			const bundle = new TPluginBundle()
			for (const plugin of plugins) {
				bundle.use(plugin.ctor)
			}
			return bundle
		},

		createAccessor(instance: any, bundle: TPluginBundle) {
			const pluginsMap = new Map<string, any>()

			for (const pluginDef of plugins) {
				const pluginInstance = bundle.get(pluginDef.ctor)
				if (pluginInstance) {
					pluginsMap.set(pluginDef.namespace, pluginInstance)
				}
			}

			return new ComponentAccessor(props, events, instance, pluginsMap)
		},
	}
}

```

---

## 3. Слой Vue Adapter (`@soldy/ui-vue`)

Здесь тоже всё предельно просто: убираем логику сборки ключей, работаем прямо с нормальными парами `exportName` (например, `'ready'` или `'element:ready'`).

#### `packages/ui/vue/src/adapter/useRuntime.ts`

```typescript
import { watch, type Ref } from 'vue'
import type { ComponentAccessor } from '@soldy/accessor'
import { useRefs } from './useRefs'

export function useRuntime(
	accessor: ComponentAccessor,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаем реактивные refs под внешними именами (tag, element:ready и т.д.)
	for (const prop of accessor.getProps(true)) {
		const exportName = accessor.getExportName(prop)
		const eventSource = accessor.getEventSource(prop)
		const triggers = accessor.getTriggers(prop)

		refs[exportName] = useRefs(
			eventSource,
			() => accessor.getValue(prop),
			triggers,
		)
	}

	// 2. Подписываемся и эмиттим события во Vue
	for (const evt of accessor.getEvents()) {
		const exportName = accessor.getExportName(evt)
		const eventSource = accessor.getEventSource(evt)

		if (eventSource && emit) {
			eventSource.on(evt.name, (...args: any[]) => {
				emit(exportName, ...args)
			})
		}
	}

	// 3. Синхронизируем Vue Props -> Accessor
	for (const prop of accessor.getProps(false)) {
		const exportName = accessor.getExportName(prop)

		watch(
			() => externalProps[exportName] ?? externalProps[prop.name],
			(newVal) => {
				if (newVal !== undefined) {
					accessor.setValue(prop, newVal)
				}
			},
		)
	}

	return { refs }
}

```

#### `packages/ui/vue/src/adapter/useProps.ts` & `useEmits.ts`

```typescript
// useProps.ts
import type { IComponentDescriptor } from '@soldy/setup'

export function useProps(descriptor: IComponentDescriptor): Record<string, any> {
	const props: Record<string, any> = {}
	const defaults = (descriptor.ctor as any)?.defaultValues ?? {}

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		// Имя с namespace если есть плагин (element:prop) или обычное
		const exportName = prop.namespace ? `${prop.namespace}:${prop.name}` : prop.name

		props[exportName] = {
			default: defaults[prop.name],
		}
	}

	props.ctrl = { type: Object, default: undefined }
	props.plugins = { type: Object, default: undefined }

	return props
}

// useEmits.ts
import type { IComponentDescriptor } from '@soldy/setup'

export function useEmits(descriptor: IComponentDescriptor): string[] {
	const emits: string[] = descriptor.events.map((e) =>
		e.namespace ? `${e.namespace}:${e.name}` : e.name,
	)

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		const exportName = prop.namespace ? `${prop.namespace}:${prop.name}` : prop.name
		emits.push(`update:${exportName}`)
		emits.push(`change:${exportName}`)
	}

	return Array.from(new Set(emits))
}

```

### В чём профит этой версии:

1. Исчезли монструозные типы `IPropSchema` с `targetKey`, `fullName` и прочим шлаком.
2. Никаких `isMain`, `namespace === 'main'`. Namespace — обычный опциональный `string | undefined`.
3. Провайдер `ComponentAccessor` берет плагин из своей `Map<string, any>` по ключу `namespace`, а если `namespace` равен `undefined`, то берет `instance`. Всё абсолютно прозрачно."

Вопрос: "Вроде все хорошо кроме useEmits export function useEmits(descriptor: IComponentDescriptor): string[] {
	const emits: string[] = descriptor.events.map((e) =>
		e.namespace ? `${e.namespace}:${e.name}` : e.name,
	)

	for (const prop of descriptor.props) {
		if (prop.protected) continue

		const exportName = prop.namespace ? `${prop.namespace}:${prop.name}` : prop.name
		emits.push(`update:${exportName}`)
		emits.push(`change:${exportName}`)
	}

	return Array.from(new Set(emits))
} Мне не нравится emits.push(`change:${exportName}`), так как нам надо возвращать тригеры и использовать именно их. А у них уже должны быть namespace, такие же как у events, например @element: ready и свойство @element:change:visible,а это значит что тригерры уже должны быть подготовлены. Остается только это emits.push(`update:${exportName}`), так как это уникальная вещь для Vue"

Ответ: "Совершенно верно! Добавлять во Vue-эмиты префикс `change:` с жесткой привязкой в `useEmits` — это ошибка, ведь события изменения свойств определяются именно через **`triggers`**, объявленные в `contributions`.

Если триггер у плагина имеет вид `'change:visible'` и принадлежит плагину `element`, то наружу во Vue он должен выходить с namespace — `@element:change:visible`.

Давайте откорректируем подготовку **`triggers`** на уровне `defineComponent` и обновим `useEmits`.

---

### 1. Подготовка triggers в `@soldy/setup` (`define-component.ts`)

При сборке `props` мы формируем триггеры сразу с учетом `namespace`, чтобы UI-слой получал их в готовеньком виде.

```typescript
function compileContribution(
	contribution?: IContribution,
	namespace?: string,
): { props: ICompiledProp[]; events: ICompiledEvent[] } {
	if (!contribution) return { props: [], events: [] }

	const props: ICompiledProp[] = (contribution.props ?? []).map((p) => ({
		name: p.name,
		protected: !!p.protected,
		// Если есть namespace, проставляем его каждому триггеру (например: 'change:visible' -> 'element:change:visible')
		triggers: (p.triggers ?? []).map((t) => (namespace ? `${namespace}:${t}` : t)),
		namespace,
	}))

	const events: ICompiledEvent[] = (contribution.events ?? []).map((name) => ({
		name,
		namespace,
	}))

	return { props, events }
}

```

---

### 2. Чистый `useEmits.ts` в `@soldy/ui-vue`

Теперь `useEmits` делает ровно то, что от него требуется:

1. Берет явные события из `events` (уже с namespace, через `getExportName`).
2. Собирает **триггеры** из `props.triggers` (они уже подготовлены с namespace).
3. Добавляет системную для Vue конструкцию `update:${exportName}` для реализации `v-model`.

```typescript
import type { IComponentDescriptor } from '@soldy/setup'

export function useEmits(descriptor: IComponentDescriptor): string[] {
	const emits: string[] = []

	// 1. Обычные события (например: 'ready', 'element:ready', 'element:removed')
	for (const event of descriptor.events) {
		const exportName = event.namespace ? `${event.namespace}:${event.name}` : event.name
		emits.push(exportName)
	}

	// 2. Триггеры и v-model updates для свойств
	for (const prop of descriptor.props) {
		// Добавляем все триггеры свойства (они уже содержат namespace, например: 'change:tag' или 'element:change:visible')
		emits.push(...prop.triggers)

		// Для публичных свойств добавляем update:* (для поддержку v-model в Vue)
		if (!prop.protected) {
			const exportName = prop.namespace ? `${prop.namespace}:${prop.name}` : prop.name
			emits.push(`update:${exportName}`)
		}
	}

	return Array.from(new Set(emits))
}

```

---

### 3. Небольшая корректировка в `useRuntime.ts`

В `useRuntime` при пробросе событий через `emit` мы также учитываем подготовленные триггеры:

```typescript
export function useRuntime(
	accessor: ComponentAccessor,
	externalProps: Record<string, any>,
	emit?: (event: string, ...args: any[]) => void,
) {
	const refs: Record<string, Ref<any>> = {}

	// 1. Создаем реактивные refs и пробрасываем события их триггеров в emit
	for (const prop of accessor.getProps(true)) {
		const exportName = accessor.getExportName(prop)
		const eventSource = accessor.getEventSource(prop)
		const triggers = accessor.getTriggers(prop)

		refs[exportName] = useRefs(
			eventSource,
			() => accessor.getValue(prop),
			triggers,
		)

		// Пробрасываем триггеры в emit при срабатывании
		if (eventSource && emit) {
			for (const trigger of prop.triggers) {
				// Извлекаем чистое имя события без namespace для подписки на eventSource
				const rawEventName = prop.namespace ? trigger.replace(`${prop.namespace}:`, '') : trigger

				eventSource.on(rawEventName, (val: any) => {
					emit(trigger, val)
				})
			}
		}
	}

	// 2. Пробрасываем явные события компонентов и плагинов
	for (const evt of accessor.getEvents()) {
		const exportName = accessor.getExportName(evt)
		const eventSource = accessor.getEventSource(evt)

		if (eventSource && emit) {
			eventSource.on(evt.name, (...args: any[]) => {
				emit(exportName, ...args)
			})
		}
	}

	// 3. Синхронизируем Vue Props -> Accessor
	for (const prop of accessor.getProps(false)) {
		const exportName = accessor.getExportName(prop)

		watch(
			() => externalProps[exportName] ?? externalProps[prop.name],
			(newVal) => {
				if (newVal !== undefined) {
					accessor.setValue(prop, newVal)
				}
			},
		)
	}

	return { refs }
}

```

Теперь архитектура абсолютно логична и выверена:

* `events` — для декларированных событий (`ready`, `element:removed`).
* `triggers` — единый источник правды для событий изменений данных (`change:tag`, `element:change:visible`).
* `update:*` — специфичная Vue-обертка исключительно для `v-model`."


Вопрос: "Скажи а нам обязательно в useProps и useEmits использовать descriptor? Может нам использовать accessor тогда мы бы имели доступ к const exportName = accessor.getExportName(prop)
		const eventSource = accessor.getEventSource(prop)
		const triggers = accessor.getTriggers(prop) и упростили бы код"

Ответ: "Это **абсолютно точное и правильное архитектурное замечание**!

В `useProps` и `useEmits` передавать `descriptor` — значит заставлять UI-слой снова руками собирать строки типа `${namespace}:${name}`, дублируя то, что уже умеет и должен делать `ComponentAccessor`.

Если вынести логику работы со свойствами, событиями и триггерами в `ComponentAccessor`, то:

1. `useEmits` и `useProps` становятся невероятно простыми и чистыми.
2. Вся работа по соглашению именования (напр. экспортируемое имя `element:visible`) инкапсулируется **в одном месте — внутри `accessor**`.

Давайте посмотрим, как упростится код.

---

### 1. Расширяем `ComponentAccessor` в `@soldy/accessor`

Добавим в `ComponentAccessor` готовый метод `getTriggers()`, который возвращает скомпилированные триггеры с учетом их `namespace`:

```typescript
// packages/provider/src/accessor.ts

export class ComponentAccessor {
	constructor(
		private props: ICompiledProp[],
		private events: ICompiledEvent[],
		private instance: any,
		private pluginsMap: Map<string, any>,
	) {}

	// ... методы getProps, getEvents, getValue, setValue ...

	/** Возвращает имя элемента для UI (например: 'tag' или 'element:ready') */
	getExportName(item: ICompiledItem): string {
		return item.namespace ? `${item.namespace}:${item.name}` : item.name
	}

	/** Возвращает скомпилированные триггеры свойства с префиксами namespace */
	getTriggers(prop: ICompiledProp): string[] {
		return prop.triggers.map((trigger) =>
			prop.namespace ? `${prop.namespace}:${trigger}` : trigger,
		)
	}
}

```

---

### 2. Обновленный, супер-простой `useEmits.ts` в `@soldy/ui-vue`

Теперь `useEmits` вообще ничего не знает про регулярки, двоеточия и склейки строк — он просто опрашивает `accessor`:

```typescript
import type { ComponentAccessor } from '@soldy/accessor'

export function useEmits(accessor: ComponentAccessor): string[] {
	const emits: string[] = []

	// 1. Все явные события ('ready', 'element:ready' и т.д.)
	for (const evt of accessor.getEvents()) {
		emits.push(accessor.getExportName(evt))
	}

	// 2. Все триггеры и v-model события свойств
	for (const prop of accessor.getProps(true)) {
		// Добавляем готовые триггеры свойства
		emits.push(...accessor.getTriggers(prop))

		// Добавляем update:* для публичных свойств (v-model)
		if (!prop.protected) {
			emits.push(`update:${accessor.getExportName(prop)}`)
		}
	}

	return Array.from(new Set(emits))
}

```

---

### 3. Обновленный `useProps.ts` в `@soldy/ui-vue`

В `useProps` аналогично исчезает любая склейка namespace:

```typescript
import type { ComponentAccessor } from '@soldy/accessor'

export function useProps(accessor: ComponentAccessor, defaultValues: Record<string, any> = {}): Record<string, any> {
	const props: Record<string, any> = {}

	// Берем только публичные пропы
	for (const prop of accessor.getProps(false)) {
		const exportName = accessor.getExportName(prop)

		props[exportName] = {
			default: defaultValues[prop.name],
		}
	}

	// Системные пропы для передачи контроллера или плагинов напрямую
	props.ctrl = { type: Object, default: undefined }
	props.plugins = { type: Object, default: undefined }

	return props
}

```

---

### Что это дает?

1. **Единая точка правды (Single Source of Truth):**
Только `ComponentAccessor` решает, как именно форматируются имена событий и свойств (`getExportName`, `getTriggers`). Если завтра вы захотите поменять формат с `element:ready` на `element/ready` — вы измените **одну строчку в одном файле `accessor.ts**`, а UI-слой даже не заметит изменений.
2. **Нулевой бойлерплейт во Vue:**
Компоненты Vue становятся тонкими обертками без единой строчки бизнес-логики или парсинга метаданных."
