/**
 * IAdapterContext — единый headless-контекст жизненного цикла компонента.
 *
 * Владеет массивом disposers и методом `.use()` для чейнинга декораторов.
 * По умолчанию применяет withPluginsBinding — биндинг instance/элемента к плагинам.
 */

import type { IComponentDescriptor } from '../descriptors'
import { withPluginsBinding } from './extensions/withPluginsBinding'

export type TAdapterExtension = (context: IAdapterContext) => void

export interface IAdapterContext {
	instance: any
	bundle: any
	accessor: any

	/** Метод для взаимодействия с DOM-элементом (устанавливается withPluginsBinding) */
	bindElement?(el: Element | null): void

	/** Зарегистрировать коллбэк очистки ресурсов */
	onDispose(fn: () => void): void

	/** Запустить все коллбэки очистки */
	destroy(): void

	/** Метод для чейнинга плагинов/декораторов */
	use(extension: TAdapterExtension): this
}

export function createAdapterContext(
	descriptor: IComponentDescriptor,
	options: { ctrl?: any; plugins?: any; props?: any },
	extensions: TAdapterExtension[] = [withPluginsBinding],
): IAdapterContext {
	const instance = options.ctrl ?? new (descriptor.ctor as any)({ props: options.props })
	const bundle = options.plugins ?? descriptor.createBundle()
	const accessor = descriptor.createAccessor(instance, bundle)

	const disposers: (() => void)[] = []

	const context: IAdapterContext = {
		instance,
		bundle,
		accessor,

		onDispose(fn: () => void) {
			disposers.push(fn)
		},

		destroy() {
			for (const fn of disposers) {
				fn()
			}
			disposers.length = 0
		},

		use(extension) {
			extension(this)
			return this
		},
	}

	// Применяем стартовый набор расширений
	for (const extension of extensions) {
		context.use(extension)
	}

	return context
}
