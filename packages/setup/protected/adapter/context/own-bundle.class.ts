/**
 * TOwnBundle — набор плагинов, который собрал этот контекст: он же его ведёт и уничтожает.
 *
 * Состав — плагины дескриптора, затем регистрации приложения для этого типа
 * (`usePlugins`, `useTheme`). Набор — инвариант компонента, а не его параметр:
 * снаружи он не принимается, наружу отдаётся доступ к уже созданному —
 * `bundle:create` и `<неймспейс>:create`.
 *
 * Порядок жизни набора записан здесь целиком — те же фазы, что у контекста:
 * собран, принят, уничтожен.
 *
 * 1. конструктор ставит плагины дескриптора и заводит `TExternalPlugins`;
 * 2. `complete()` — после начальных значений плагинов дескриптора — ставит
 *    плагины реестра: они приходят `TExternalPlugins` тем же событием `use`,
 *    что и любой плагин, поставленный позже. Собранный набор на чужие шины не
 *    подписан и наружу не объявлен: сборку, которую фреймворк так и не
 *    принял, уничтожать некому, и всё, что она повесила бы на чужой `ctrl`
 *    или движок, осталось бы там навсегда;
 * 3. `attach()` — компонент принят: набор принимает плагины (их подписки на
 *    чужие шины начинаются здесь) и ставит объявление на микрозадачу —
 *    сначала `bundle:create` на шине инстанса, потом `bundle.created()`.
 *    Синхронно нельзя: подписчик событий наружу появляется уже после того,
 *    как контекст принят. Набор, уничтоженный до микрозадачи, не объявляется
 *    вовсе;
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
		mountId?: string,
	) {
		const bundle = new TPluginBundle(_instance, mountId)

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
	}

	attach(): void {
		this.bundle.attach()
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
