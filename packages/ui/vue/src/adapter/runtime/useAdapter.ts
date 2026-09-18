/**
 * useAdapter — единственный Vue-хук на весь проект.
 *
 * 1. Связывает компонент с Vue через связку `bindComponent` из setup: рефы
 *    свойств, входные пропсы, события и `update:<prop>` для v-model
 * 2. Привязывает DOM-элемент корня к TElementPlugin через контекст
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import { TElementPlugin } from '@soldy/plugins'
import { bindComponent, type IAdapterContext, type TInstanceState } from '@soldy/setup'
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
 * Тип реактивных рефов, которые генерация useSyncProps возвращает в ...refs.
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
 * - выходы плагинов `TOutputs` (`DescriptorPluginOutputs`) — того же вида, что
 *   у остальных адаптеров (`TInstanceState`): снимок, только чтение,
 *   необязательный ключ
 */
export type TBinding<TProps, TInstance, TOutputs extends object = object> = {
	ctrl: TInstance
	plugins: IPluginBundle | null
	rootElement?: Ref<Element | null>
} & TUnwrapRefs<TProps> &
	TExtractControllerState<TInstance> &
	TInstanceState<TOutputs>

/**
 * Типизированный вид на рефы адаптера: пропы `TProps`, свойства инстанса и
 * выходы плагинов `TOutputs`.
 *
 * Граница между рантаймом и типом, одна на `useAdapter` и
 * `useCollectionAdapter` — как `toInstanceState` у остальных адаптеров. Рефы
 * связки собраны по дескриптору из того же инстанса, что описывает
 * `TInstance`, и из плагинов, чьи выходы описывает `TOutputs`, но по именам
 * свойств — эту связь держит дескриптор, TypeScript её не видит. В значениях
 * лежат `Ref`, а тип уже развёрнут: рефы из результата `setup()` шаблон
 * разворачивает сам.
 */
export function toBindingState<TProps, TInstance, TOutputs extends object = object>(
	refs: Readonly<Record<string, unknown>>,
): TUnwrapRefs<TProps> & TExtractControllerState<TInstance> & TInstanceState<TOutputs> {
	return refs as TUnwrapRefs<TProps> &
		TExtractControllerState<TInstance> &
		TInstanceState<TOutputs>
}

/**
 * Общая часть `useAdapter` и `useCollectionAdapter`: подписки, DOM-биндинг и
 * очистка. Отдаёт то, из чего каждый хук собирает свой результат.
 */
export function useAdapterParts<TInstance extends object>(
	adapter: IAdapterContext<TInstance>,
	props: object,
	emit?: (event: string, ...args: unknown[]) => void,
): { refs: Readonly<Record<string, Ref<unknown>>>; rootElement: Ref<Element | null> | null } {
	const binding = bindComponent(adapter, VueProfile)
	const offs: Array<() => void> = []

	// 1. Core → Vue: реф на каждое свойство с триггерами
	const refs: Record<string, Ref<unknown>> = {}

	for (const [name, value] of Object.entries(binding.state())) refs[name] = ref(value)

	offs.push(
		binding.bindOutput((prop, value) => {
			const target = refs[prop.exportName]

			if (target) target.value = value
		}),
	)

	// 2. Vue → Core: `watch` на каждый входной проп, а не на весь объект —
	// иначе смена любого пропа переписала бы в ядро и те, что ядро с тех пор
	// поменяло само (открытый по клику список закрылся бы от смены placeholder).
	// Начальные значения применила сборка контекста, здесь — только изменения
	for (const prop of binding.surface.inputs) {
		offs.push(
			watch(
				() => binding.read(prop, props),
				(value) => binding.write(prop, value),
			),
		)
	}

	// 3. Эмиты: события ядра, затем `update:<prop>` для v-model. Значение
	// перечитывается связкой, а не берётся из аргумента события: у производных
	// триггеров полезная нагрузка может не совпадать со значением свойства.
	if (emit) {
		offs.push(binding.bindEvents((exportName, args) => emit(exportName, ...args)))
		offs.push(
			binding.bindOutput((prop, value) => {
				if (!prop.protected) emit(`update:${prop.exportName}`, value)
			}),
		)
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
 * Компоненты передают дженерики явно, поэтому выходы плагинов из типа контекста
 * не выводятся: их передаёт третьим аргументом компонент, чей шаблон читает
 * выход, — `DescriptorPluginOutputs<typeof XDescriptor>`.
 */
export function useAdapter<
	TProps extends Record<string, any> = Record<string, any>,
	TInstance extends object = object,
	TOutputs extends object = object,
>(
	adapter: IAdapterContext<TInstance, TOutputs>,
	props: TProps,
	emit?: (event: string, ...args: unknown[]) => void,
): TBinding<TProps, TInstance, TOutputs> {
	const { refs, rootElement } = useAdapterParts(adapter, props, emit)

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		...(rootElement ? { rootElement } : {}),
		...toBindingState<TProps, TInstance, TOutputs>(refs),
	}
}
