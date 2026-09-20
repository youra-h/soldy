/**
 * useAdapter — единственный Vue-хук на весь проект.
 *
 * 1. Связывает компонент с Vue через обмен `adapter.connect()` из setup: рефы
 *    свойств, входные пропсы, события и `update:<prop>` для v-model
 * 2. Привязывает DOM-элемент корня к TElementPlugin через контекст
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import { TElementPlugin } from '@soldy/plugins'
import { type IAdapterContext, type IComponentContract, type TInstanceState } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { VueProfile } from '../common'

/**
 * Вспомогательный тип: извлекает публичные свойства и геттеры из контроллера (TInstance),
 * исключая методы (функции).
 */
export type TExtractControllerState<TInstance> = {
	[K in keyof TInstance as TInstance[K] extends (...args: never[]) => unknown
		? never
		: K]: TInstance[K]
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
	// и заводятся
	const refs: Record<string, Ref<unknown>> = {}

	offs.push(
		link.state.subscribe((name, value) => {
			const target = refs[name]

			if (target) target.value = value
			else refs[name] = ref(value)
		}),
	)

	// 2. Vue → Core: `watch` на каждый входной проп, а не на весь объект — Vue
	// отдаёт пропсы по одному, когда проп сменился. Начальные значения применила
	// сборка контекста, здесь — только изменения
	for (const input of link.inputs) {
		offs.push(
			watch(
				() => input.pick(props),
				(value) => input.offer(value),
			),
		)
	}

	// 3. Эмиты: события ядра и `update:<prop>` для v-model — его обмен шлёт по
	// профилю, сразу после события ядра
	if (emit) {
		offs.push(link.events.listen((name, args) => emit(name, ...args)))
	}

	// 4. DOM-биндинг. Ссылка на корень нужна только там, где её есть куда
	// привязать: у headless-слоёв и фасада коллекции `TElementPlugin` нет, и
	// `rootElement` в результат не попадает.
	const rootElement = adapter.bundle?.get(TElementPlugin) ? ref<Element | null>(null) : null

	if (rootElement) {
		watch(rootElement, (el) => adapter.bindElement(el ?? null), { flush: 'post' })
	}

	// 5. Очистка. Отписка обязательна: при внешнем `ctrl`, переживающем компонент,
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
