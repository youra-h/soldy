/**
 * useVue — единственный Vue-хук на весь проект.
 *
 * 1. Навешивает реактивность (SyncProps / SyncEvents)
 * 2. Привязывает DOM-элемент через TPluginsBindingExtension
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import { type IAdapterContext, TPluginsBindingExtension } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

/**
 * Вспомогательный тип: извлекает публичные свойства и геттеры из контроллера (TInstance),
 * исключая методы (функции).
 */
export type TExtractControllerState<TInstance> = {
	[K in keyof TInstance as TInstance[K] extends Function ? never : K]: TInstance[K]
}

/**
 * Тип реактивных рефов, которые генерация useSyncProps возвращает в ...refs.
 * Во Vue setup() автоматизирует unref для всех Ref в шаблоне.
 */
export type TUnwrapRefs<T> = {
	[K in keyof T]: T[K] extends Ref<infer U> ? U : T[K]
}

/**
 * Итоговый тип, который возвращает useVue и который видит Vue-шаблон:
 * - ctrl: сам инстанс контроллера TInstance
 * - plugins: бандл плагинов
 * - rootElement: ссылка на DOM-узел
 * - refs: динамические пропсы компонента
 */
export type TVueBinding<TProps, TInstance> = {
	ctrl: TInstance
	plugins: any
	rootElement?: Ref<Element | null>
} & TUnwrapRefs<TProps> &
	TExtractControllerState<TInstance>

export function useVue<TProps extends Record<string, any> = Record<string, any>, TInstance = any>(
	adapter: IAdapterContext,
	props: TProps,
	emit?: (event: string, ...args: any[]) => void,
): TVueBinding<TProps, TInstance> {
	const inspector = createInspector(adapter.accessor)

	// 1. Реактивность
	const { refs, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)

	// 1.1. Привязка к внешним пропсам (выход в родительский компонент)
	bindOutput()

	// 1.2. Привязка к внешним пропсам (вход от пользователя)
	bindInput(props)

	// 2. Эмиты
	useSyncEvents(adapter.accessor, inspector, emit)

	// 3. DOM-биндинг через экстеншн плагинов
	const pluginsExt = adapter.get(TPluginsBindingExtension)
	const rootElement = pluginsExt ? ref<Element | null>(null) : null

	if (pluginsExt && rootElement) {
		watch(rootElement, (el) => pluginsExt.bindElement(el ?? null), { flush: 'post' })
	}

	// 4. Очистка (destroy эмитит 'destroy', все экстеншны отписываются сами)
	onUnmounted(() => {
		adapter.destroy()
	})

	return {
		ctrl: adapter.instance as TInstance,
		plugins: adapter.bundle,
		...(rootElement ? { rootElement } : {}),
		...refs,
	} as unknown as TVueBinding<TProps, TInstance>
}
