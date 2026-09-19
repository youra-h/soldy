/**
 * TAdapterContext — контекст адаптера: собранный компонент, расширения по классу и уничтожение.
 *
 * Устроен как `TPluginBundle` у плагинов: расширение подключается
 * `.use(Ctor, options?)` и извлекается `.get(Ctor)`. Жизненный цикл — через
 * `TEvented`: `destroy()` эмитит `destroy`, забывает расширения и уничтожает
 * плагины монтирования.
 *
 * `bindElement` — связка корневого узла разметки с `TElementPlugin`: её зовут
 * все шесть адаптеров, поэтому она метод контекста, а не расширение, которое
 * каждый из них обязан помнить и подключать. У компонента без `TElementPlugin`
 * (headless-слои) вызов ничего не делает.
 *
 * Чей набор — свой или владельца, — контекст не знает: это решила сборка
 * (`IComponentPlugins`), и плагины снаружи, и уничтожение набора ведёт она.
 */

import { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { IAssembledComponent, IComponentPlugins } from '../../assemble'
import type { IComponentContract, IComponentDescriptor } from '../../define'
import type { IAdapterContext, TAdapterEvents, TAnyExtensionCtor } from './types'

export class TAdapterContext<C extends IComponentContract> implements IAdapterContext<C> {
	readonly instance: C['instance']
	readonly bundle: IPluginBundle | null
	readonly accessor: TAccessor
	readonly descriptor: IComponentDescriptor
	readonly props: object
	readonly embedded: string | undefined
	readonly events = new TEvented<TAdapterEvents>()

	private readonly _extensions = new Map<TAnyExtensionCtor, unknown>()
	private readonly _plugins: IComponentPlugins

	constructor(
		descriptor: IComponentDescriptor,
		component: IAssembledComponent<C['instance']>,
		props: object,
	) {
		this.instance = component.instance
		this.bundle = component.plugins.bundle
		this.accessor = component.accessor
		this.descriptor = descriptor
		this.props = props
		this.embedded = component.embedded
		this._plugins = component.plugins
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

	writePluginProps(values: unknown): void {
		this._plugins.writeExternal(values)
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()
		this._plugins.destroy()
	}
}
