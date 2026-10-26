/**
 * useAdapter — единственный Vue-хук на весь проект.
 *
 * 1. Связывает компонент с Vue через обмен `adapter.connect()` из setup: рефы
 *    свойств, входные пропсы, события и `update:<prop>` для v-model
 * 2. Принимает компонент — adapter.attach() в setup
 * 3. Привязывает DOM-элемент корня к TElementPlugin через контекст
 * 4. Вызывает adapter.destroy() при анмаунте компонента
 */

import {
	ref,
	shallowRef,
	watch,
	onUnmounted,
	onBeforeUpdate,
	getCurrentInstance,
	type Ref,
} from 'vue'
import { TElementPlugin } from '@soldy-ui/plugins'
import { type IAdapterContext, type IComponentContract, type TInstanceState } from '@soldy-ui/setup'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { VueProfile } from '../common'

/**
 * Вспомогательный тип: извлекает публичные свойства и геттеры из контроллера (TInstance),
 * исключая методы (функции).
 */
export type TExtractControllerState<TInstance> = {
	[
		K in keyof TInstance as TInstance[K] extends (...args: never[]) => unknown ? never : K
	]: TInstance[K]
}

/**
 * Тип реактивных рефов, которые `useAdapter` собирает по обмену `adapter.connect()`
 * и возвращает в ...refs.
 * Во Vue setup() автоматизирует unref для всех Ref в шаблоне.
 */
export type TUnwrapRefs<T> = {
	[K in keyof T]: T[K] extends Ref<infer U> ? U : T[K]
}

/**
 * Итоговый тип, который возвращает useAdapter и который видит Vue-шаблон:
 * - ctrl: сам инстанс контроллера TInstance
 * - plugins: бандл плагинов
 * - rootElement: ссылка на DOM-узел
 * - refs: динамические пропсы компонента
 * - выходы плагинов из контракта `C` — того же вида, что у остальных
 *   адаптеров (`TInstanceState`): снимок, только чтение, необязательный ключ
 */
export type TBinding<C extends IComponentContract, TProps> = {
	ctrl: C['instance']
	plugins: IPluginBundle | null
	rootElement?: Ref<Element | null>
} & TBindingState<C, TProps>

/** Рефы адаптера в типах: пропы `TProps`, свойства инстанса и выходы плагинов контракта. */
export type TBindingState<C extends IComponentContract, TProps> = TUnwrapRefs<TProps> &
	TExtractControllerState<C['instance']> &
	TInstanceState<C['plugins']['outputs']>

/**
 * Типизированный вид на рефы адаптера (`TBindingState`).
 *
 * Граница между рантаймом и типом, одна на `useAdapter` и
 * `useCollectionAdapter` — как `toInstanceState` у остальных адаптеров. Рефы
 * связки собраны по дескриптору из того же инстанса и тех же плагинов, что
 * описывает контракт `C`, но по именам свойств — эту связь держит дескриптор,
 * TypeScript её не видит. В значениях лежат `Ref`, а тип уже развёрнут: рефы
 * из результата `setup()` шаблон разворачивает сам.
 */
export function toBindingState<C extends IComponentContract, TProps>(
	refs: Readonly<Record<string, unknown>>,
): TBindingState<C, TProps> {
	return refs as TBindingState<C, TProps>
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: подписки, DOM-биндинг и
 * очистка. Отдаёт то, из чего каждый хук собирает свой результат.
 */
export function useAdapterParts(
	adapter: IAdapterContext,
	props: object,
	emit?: (event: string, ...args: unknown[]) => void,
): { refs: Readonly<Record<string, Ref<unknown>>>; rootElement: Ref<Element | null> | null } {
	const link = adapter.connect(VueProfile)
	const offs: Array<() => void> = []

	// 1. Core → Vue: реф на каждое свойство с триггерами. Подписка сразу отдаёт
	// значение каждого — тем же вызовом, что и срабатывание триггера: так рефы
	// и заводятся.
	//
	// Реф мелкий (`shallowRef`): ядро отдаёт значения, а не ручки на живое
	// состояние, и о смене сообщает новым значением (AGENTS.md, «Контракт
	// границы core → ui»). Глубокий `ref` оборачивал бы в прокси всё
	// составное — массив ячеек строки таблицы, каждую ячейку, её `aria` и
	// `dataset`, элементы коллекции — с зависимостью Vue на каждый прочитанный
	// ключ, и следить за ними незачем: на месте их никто не меняет. В таблице
	// это была почти пятая часть памяти строки (benchmarks/table/history.md, 869fekb4g)
	const refs: Record<string, Ref<unknown>> = {}

	offs.push(
		link.state.subscribe((name, value) => {
			const target = refs[name]

			if (target) target.value = value
			else refs[name] = shallowRef(value)
		}),
	)

	// 2. Vue → core: the inputs go to the core as a full set before a render
	// that brought a new vnode from the parent. A parent pass that changed the
	// props updates the component, and Vue calls `onBeforeUpdate` with the new
	// props already in place and before the render; a render of the
	// component's own state keeps the vnode and leaves the inputs alone.
	// Unchanged inputs write nothing: the input memory swallows a repeat. The
	// starting values were applied by the context assembly, so only changes
	// go here.
	//
	// Not a `watch` over the props: to have Vue track the inputs its getter
	// read every one of them, and each read of the props proxy creates a `Dep`
	// and a `Link` for its key, present or not, on top of the effect with its
	// scheduler and closures — on every component. That was a tenth of a
	// button and a seventh of a Select page (benchmarks/pages/vue.md, 869fmhuag)
	const instance = getCurrentInstance()
	let vnode = instance?.vnode

	onBeforeUpdate(() => {
		if (!instance || instance.vnode === vnode) return

		vnode = instance.vnode
		link.inputs.full(props)
	})

	// 3. Эмиты: события ядра и `update:<prop>` для v-model — его обмен шлёт по
	// профилю, сразу после события ядра
	if (emit) {
		offs.push(link.events.listen((name, args) => emit(name, ...args)))
	}

	// 4. Компонент принят: у Vue это сама `setup()`, повторов и отброшенных
	// сборок не бывает. Здесь же, а не в `onMounted`: `setup()` идёт и на
	// сервере, и элемент коллекции должен войти в неё к серверной разметке
	adapter.attach()

	// 5. DOM-биндинг. Ссылка на корень нужна только там, где её есть куда
	// привязать: у headless-слоёв и фасада коллекции `TElementPlugin` нет, и
	// `rootElement` в результат не попадает.
	const rootElement = adapter.bundle?.get(TElementPlugin) ? ref<Element | null>(null) : null

	if (rootElement) {
		watch(rootElement, (el) => adapter.bindElement(el ?? null), { flush: 'post' })
	}

	// 6. Очистка. Отписка обязательна: при внешнем `ctrl`, переживающем компонент,
	// adapter.destroy() не трогает instance.events — хендлеры копились бы с каждым
	// монтированием.
	onUnmounted(() => {
		offs.forEach((off) => off())
		adapter.destroy()
	})

	return { refs, rootElement }
}

/**
 * Дженерики компонент не пишет: инстанс и выходы плагинов — из контракта в типе
 * контекста (его выводит `createVueAdapterContext`), пропы — из самих `props`.
 */
export function useAdapter<C extends IComponentContract, TProps extends object>(
	adapter: IAdapterContext<C>,
	props: TProps,
	emit?: (event: string, ...args: unknown[]) => void,
): TBinding<C, TProps> {
	const { refs, rootElement } = useAdapterParts(adapter, props, emit)

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		...(rootElement ? { rootElement } : {}),
		...toBindingState<C, TProps>(refs),
	}
}
