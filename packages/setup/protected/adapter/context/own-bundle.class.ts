/**
 * TOwnBundle — набор плагинов, который собрал этот контекст: он же его ведёт и уничтожает.
 *
 * Состав — плагины дескриптора, затем регистрации приложения для этого типа
 * (`usePlugins`, `useTheme`). Набор — инвариант компонента, а не его параметр:
 * снаружи он не принимается, наружу отдаётся доступ к уже созданному —
 * `bundle:create` и `<неймспейс>:create`.
 *
 * Порядок жизни набора записан здесь целиком:
 *
 * 1. конструктор ставит плагины дескриптора и заводит `TExternalPlugins`;
 * 2. `complete()` — после начальных значений инстанса и плагинов дескриптора —
 *    ставит плагины реестра (они приходят `TExternalPlugins` тем же событием
 *    `use`, что и любой плагин, поставленный позже) и объявляет набор наружу;
 * 3. объявление — на микрозадаче: сначала `bundle:create` на шине инстанса,
 *    потом `bundle.created()`. Синхронно нельзя: адаптер подписывается на
 *    события уже после того, как получил контекст. Набор, уничтоженный до
 *    микрозадачи (синхронное размонтирование, React StrictMode со своим
 *    `ctrl`), не объявляется вовсе;
 * 4. `destroy()` отвязывает узел **до** уничтожения набора — плагины успевают
 *    получить `removed`.
 */

import type { IEventEmitter } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { IPluginBundle } from '@soldy-ui/plugins'
import { PLUGIN_PROPS } from '../../naming'
import { resolveRegisteredPlugins } from '../../registry'
import type { IBundleContext, IComponentDescriptor, TPropSpec } from '../../define'
import { TMember } from '../exchange/member.class'
import { TExternalPlugins } from './external-plugins.class'
import type { IBundleTenancy } from './types'

function hasEmit(value: unknown): value is Pick<IEventEmitter, 'emit'> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'emit' in value &&
		typeof value.emit === 'function'
	)
}

export class TOwnBundle implements IBundleTenancy {
	readonly bundle: IPluginBundle
	readonly members: readonly TMember[]

	private readonly _external: TExternalPlugins

	/** Своим плагинам и связке начальные значения пишет эта сборка. */
	get seeded(): readonly TMember[] {
		return this.members
	}

	constructor(
		private readonly _descriptor: Pick<IComponentDescriptor, 'ctor' | 'plugins' | 'props'>,
		private readonly _instance: object,
		private readonly _context: IBundleContext,
	) {
		const bundle = new TPluginBundle(_instance)

		for (const plugin of _descriptor.plugins) bundle.use(plugin.ctor, plugin.options ?? {})

		this.bundle = bundle
		this._external = new TExternalPlugins(
			bundle,
			_instance,
			new Set(_descriptor.plugins.map((plugin) => plugin.ctor)),
		)

		this.members = [
			..._descriptor.plugins.flatMap((plugin) => {
				const owner = bundle.get(plugin.ctor)

				return owner ? [new TMember(owner, plugin.props, plugin.events)] : []
			}),
			// Связка — такой же участник: её свойство `pluginProps` пишет обычная линия
			new TMember(this._external, this._externalProps()),
		]
	}

	complete(): void {
		for (const plugin of resolveRegisteredPlugins(this._instance, this._context)) {
			if (this._descriptor.plugins.some((own) => own.ctor === plugin.ctor)) {
				throw new Error(
					`${plugin.ctor.name} уже входит в состав ${this._descriptor.ctor.name}: плагин реестра только добавляет`,
				)
			}

			this.bundle.use(plugin.ctor, plugin.options ?? {})
		}

		this._announce()
	}

	destroy(): void {
		this._external.destroy()

		const element = this.bundle.get(TElementPlugin)

		if (element) element.element = null

		this.bundle.destroy()
	}

	/** Описание `pluginProps` — с умолчанием от класса его владельца, как у любого другого пропа. */
	private _externalProps(): TPropSpec[] {
		return this._descriptor.props
			.filter((spec) => spec.name.name === PLUGIN_PROPS)
			.map((spec) => spec.rebase(TExternalPlugins.defaultValues))
	}

	private _announce(): void {
		const { bundle } = this

		void Promise.resolve().then(() => {
			if (bundle.destroyed) return

			const events: unknown = Reflect.get(this._instance, 'events')

			if (hasEmit(events)) events.emit('bundle:create', bundle)

			bundle.created()
		})
	}
}
