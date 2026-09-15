/**
 * useAdapter — единственный Vue-хук на весь проект.
 *
 * 1. Навешивает реактивность (SyncProps / SyncEvents)
 * 2. Привязывает DOM-элемент через TPluginsBindingExtension
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import { type IAdapterContext, TPluginsBindingExtension } from '@soldy/setup'
import type { IPluginBundle } from '@soldy/plugins'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

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
 */
export type TBinding<TProps, TInstance> = {
	ctrl: TInstance
	plugins: IPluginBundle | null
	rootElement?: Ref<Element | null>
} & TUnwrapRefs<TProps> &
	TExtractControllerState<TInstance>

/**
 * Типизированный вид на рефы адаптера: пропы `TProps` и свойства инстанса.
 *
 * Граница между рантаймом и типом, одна на `useAdapter` и
 * `useCollectionAdapter` — как `toInstanceState` у остальных адаптеров. Рефы
 * `useSyncProps` собраны по дескриптору из того же инстанса, что описывает
 * `TInstance`, но по именам свойств — эту связь держит дескриптор, TypeScript
 * её не видит. В значениях лежат `Ref`, а тип уже развёрнут: рефы из
 * результата `setup()` шаблон разворачивает сам.
 */
export function toBindingState<TProps, TInstance>(
	refs: Readonly<Record<string, unknown>>,
): TUnwrapRefs<TProps> & TExtractControllerState<TInstance> {
	return refs as TUnwrapRefs<TProps> & TExtractControllerState<TInstance>
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
	const inspector = createInspector(adapter.accessor)

	// 1. Реактивность
	const { refs, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)

	// 1.1. Привязка к внешним пропсам (выход в родительский компонент)
	bindOutput()

	// 1.2. Привязка к внешним пропсам (вход от пользователя)
	bindInput(props)

	// 2. Эмиты
	const unbindEvents = useSyncEvents(adapter.accessor, inspector, emit)

	// 3. DOM-биндинг через экстеншн плагинов
	const pluginsExt = adapter.get(TPluginsBindingExtension)
	const rootElement = pluginsExt ? ref<Element | null>(null) : null

	if (pluginsExt && rootElement) {
		watch(rootElement, (el) => pluginsExt.bindElement(el ?? null), { flush: 'post' })
	}

	// 4. Очистка. Отписка обязательна: при внешнем `ctrl`, переживающем компонент,
	// adapter.destroy() не трогает instance.events — хендлеры копились бы с каждым
	// монтированием. Подписки из useSyncProps снимает его собственный onUnmounted.
	onUnmounted(() => {
		unbindEvents()
		adapter.destroy()
	})

	return { refs, rootElement }
}

export function useAdapter<
	TProps extends Record<string, any> = Record<string, any>,
	TInstance extends object = object,
>(
	adapter: IAdapterContext<TInstance>,
	props: TProps,
	emit?: (event: string, ...args: unknown[]) => void,
): TBinding<TProps, TInstance> {
	const { refs, rootElement } = useAdapterParts(adapter, props, emit)

	return {
		ctrl: adapter.instance,
		plugins: adapter.bundle,
		...(rootElement ? { rootElement } : {}),
		...toBindingState<TProps, TInstance>(refs),
	}
}
