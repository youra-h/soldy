/**
 * TAdapterContext — контекст адаптера: собранный компонент, расширения по классу и уничтожение.
 *
 * Устроен как `TPluginBundle` у плагинов: расширение подключается
 * `.use(Ctor, options?)` и извлекается `.get(Ctor)`. Жизненный цикл — через
 * `TEvented`: `destroy()` эмитит `destroy`, забывает расширения и уничтожает
 * набор, если тот собран для этого контекста.
 *
 * `bindElement` — связка корневого узла разметки с `TElementPlugin`: её зовут
 * все шесть адаптеров, поэтому она метод контекста, а не расширение, которое
 * каждый из них обязан помнить и подключать. У компонента без `TElementPlugin`
 * (headless-слои) вызов ничего не делает.
 */

import { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { IAssembledComponent } from '../../assemble'
import type { IComponentDescriptor } from '../../define'
import type { IAdapterContext, TAdapterEvents, TAnyExtensionCtor } from './types'

export class TAdapterContext<TInstance extends object> implements IAdapterContext<TInstance> {
	readonly instance: TInstance
	readonly bundle: IPluginBundle | null
	readonly accessor: TAccessor
	readonly descriptor: IComponentDescriptor
	readonly props: object
	readonly embedded: string | undefined
	readonly events = new TEvented<TAdapterEvents>()

	private readonly _extensions = new Map<TAnyExtensionCtor, unknown>()
	/** Набор собран для этого контекста; пришедший в конфиге уничтожает тот, кто его передал. */
	private readonly _ownsBundle: boolean

	constructor(
		descriptor: IComponentDescriptor,
		component: IAssembledComponent<TInstance>,
		props: object,
	) {
		this.instance = component.instance
		this.bundle = component.bundle
		this.accessor = component.accessor
		this.descriptor = descriptor
		this.props = props
		this.embedded = component.embedded
		this._ownsBundle = component.ownsBundle
	}

	use(ExtensionCtor: TAnyExtensionCtor, options?: unknown): this {
		this._extensions.set(ExtensionCtor, new ExtensionCtor(this, options))

		return this
	}

	get<T>(ExtensionCtor: new (...args: any[]) => T): T | undefined {
		const extension = this._extensions.get(ExtensionCtor)

		return extension instanceof ExtensionCtor ? extension : undefined
	}

	bindElement(element: Element | null): void {
		const plugin = this.bundle?.get(TElementPlugin)

		if (plugin) plugin.element = element
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()

		// Узел отвязывается до уничтожения набора: плагины успевают получить
		// `removed`. Чужой набор не трогаем — его узел привязывал владелец.
		if (this._ownsBundle) {
			this.bindElement(null)
			this.bundle?.destroy()
		}
	}
}
