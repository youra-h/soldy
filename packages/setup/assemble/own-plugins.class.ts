/**
 * TOwnPlugins — набор плагинов, собранный для этого монтирования.
 *
 * Состав — плагины дескриптора и регистрации приложения (`resolveComposition`),
 * набор — по составу, с объявлением наружу (`assembleBundle`). Кто набор
 * собрал, тот его и ведёт: пишет начальные значения пропсов плагинов,
 * подключает плагины, поставленные снаружи (`TExternalPlugins`), и уничтожает
 * набор вместе с контекстом.
 *
 * Регистрации приложения действуют здесь и только здесь — там, где набор
 * создаётся: набор владельца, на котором работает фасад коллекции
 * (`TSharedPlugins`), уже собран по своему составу.
 */

import type { TProperty } from '@soldy/accessor'
import { TElementPlugin } from '@soldy/plugins'
import type { IPluginBundle } from '@soldy/plugins'
import type { IBundleContext, IComponentDescriptor } from '../define/types'
import { PLUGIN_PROPS } from '../naming'
import { assembleBundle } from './bundle'
import { resolveComposition } from './composition'
import { TExternalPlugins } from './external-plugins.class'
import { applyInitialProps } from './initial-props'
import type { IComponentPlugins, ICompositionEntry } from './types'

export class TOwnPlugins implements IComponentPlugins {
	readonly composition: readonly ICompositionEntry[]
	readonly bundle: IPluginBundle | null

	/** Есть после `initialize` и только у компонента с набором. */
	private _external: TExternalPlugins | null = null

	constructor(
		private readonly _descriptor: Pick<IComponentDescriptor, 'ctor' | 'plugins'>,
		private readonly _instance: object,
		context: IBundleContext,
	) {
		this.composition = resolveComposition(_descriptor, _instance, context)
		this.bundle = assembleBundle(this.composition, _instance)
	}

	/**
	 * Сначала пропсы плагинов дескриптора, потом плагины снаружи: внешний плагин
	 * зависит от плагинов компонента, а не наоборот, и застаёт их уже
	 * настроенными.
	 */
	initialize(properties: readonly TProperty[], props: object | undefined): void {
		applyInitialProps(properties, props)

		if (!this.bundle) return

		this._external = new TExternalPlugins(
			this.bundle,
			this._instance,
			new Set(this._descriptor.plugins.map((plugin) => plugin.ctor)),
			this.composition.map((entry) => entry.ctor),
			props ? Reflect.get(props, PLUGIN_PROPS) : undefined,
		)
	}

	writeExternal(values: unknown): void {
		this._external?.write(values)
	}

	destroy(): void {
		this._external?.destroy()

		// Узел отвязывается до уничтожения набора: плагины успевают получить `removed`
		const element = this.bundle?.get(TElementPlugin)

		if (element) element.element = null

		this.bundle?.destroy()
	}
}
