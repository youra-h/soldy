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
 *
 * Плагины, поставленные снаружи, ведёт `TExternalPlugins`: их пропсы из
 * `pluginProps`, их события — конвертом `plugin:event`. Только у контекста,
 * который собрал свой набор: чужой набор ведёт его владелец.
 */

import { TEvented } from '@soldy/core'
import type { TAccessor } from '@soldy/accessor'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { IAssembledComponent } from '../../assemble'
import type { IComponentContract, IComponentDescriptor } from '../../define'
import { PLUGIN_PROPS } from '../../naming'
import { TExternalPlugins } from './external-plugins.class'
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
	/** Набор собран для этого контекста; пришедший в конфиге уничтожает тот, кто его передал. */
	private readonly _ownsBundle: boolean
	private readonly _external: TExternalPlugins | null

	constructor(
		descriptor: IComponentDescriptor,
		component: IAssembledComponent<C['instance']>,
		props: object,
	) {
		this.instance = component.instance
		this.bundle = component.bundle
		this.accessor = component.accessor
		this.descriptor = descriptor
		this.props = props
		this.embedded = component.embedded
		this._ownsBundle = component.ownsBundle
		this._external =
			component.ownsBundle && component.bundle
				? new TExternalPlugins(
						component.bundle,
						component.instance,
						new Set(descriptor.plugins.map((plugin) => plugin.ctor)),
						component.composition.map((entry) => entry.ctor),
						Reflect.get(props, PLUGIN_PROPS),
					)
				: null
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
		this._external?.write(values)
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()
		this._external?.destroy()

		// Узел отвязывается до уничтожения набора: плагины успевают получить
		// `removed`. Чужой набор не трогаем — его узел привязывал владелец.
		if (this._ownsBundle) {
			this.bindElement(null)
			this.bundle?.destroy()
		}
	}
}
