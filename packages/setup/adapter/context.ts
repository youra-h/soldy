/**
 * IAdapterContext — единый headless-контекст жизненного цикла компонента.
 *
 * Владеет массивом disposers и методом `.use()` для чейнинга декораторов.
 * Заменяет разрозненные createAdapter / createCollectionAdapter / createCollectionItemAdapter.
 */

import type { IComponentDescriptor } from '../descriptors'

export interface IAdapterContext {
	instance: any
	bundle: any
	accessor: any

	/** Зарегистрировать коллбэк очистки ресурсов */
	onDispose(fn: () => void): void

	/** Запустить все коллбэки очистки */
	destroy(): void

	/** Метод для чейнинга плагинов/декораторов */
	use<T extends IAdapterContext>(extension: (context: this) => void): this
}

export function createAdapterContext(
	descriptor: IComponentDescriptor,
	options: { ctrl?: any; plugins?: any; props?: any },
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

	return context
}
