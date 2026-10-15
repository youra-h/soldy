/**
 * TAdapterContext — компонент на время монтирования: инстанс, набор, участники обмена и расширения.
 *
 * Расширения регистрируются по самому классу — карта ключуется конструктором,
 * как `TPluginBundle` ключуется классом плагина.
 *
 * `bindElement` — метод контекста, а не расширение: связку корня с
 * `TElementPlugin` зовут все шесть адаптеров, а расширение каждый из них был бы
 * обязан помнить и подключать.
 *
 * Жизнь контекста — три фазы: собран, принят фреймворком (`attach`), уничтожен.
 * Когда наступает вторая, знает только рантайм адаптера: у Vue, Solid, Svelte,
 * Angular и Web Components это сама сборка, у React — коммит. Поэтому фаза —
 * метод контекста, как `bindElement`, а не шаг, который помнит каждый компонент.
 *
 * Пропсы сборки контекст держит до первого `connect()`. Нужны они двоим:
 * расширениям, которые читают их в конструкторе (`meta` элемента коллекции), и
 * обмену — его память входов начинается с них. Дальше память входов живёт
 * своими ячейками, и контекст пропсы отпускает: пропсы сборки бывают снимком
 * одного прохода фреймворка, и до размонтирования контекст держал бы значения,
 * которые с тех пор сменились, — у таблицы прежний список строк со всеми
 * записями.
 *
 * Обмен один на монтирование: первый `connect()` его заводит, повторный с тем
 * же профилем отдаёт его же — фреймворк вправе позвать инициализатор связки
 * дважды, а пропсов сборки, с которых начать второй обмен, у контекста уже
 * нет. С другим профилем — ошибка: одно монтирование — один фреймворк.
 */

import { TEvented } from '@soldy-ui/core'
import { TElementPlugin } from '@soldy-ui/plugins'
import type { IPluginBundle } from '@soldy-ui/plugins'
import type { IComponentContract, IComponentDescriptor } from '../../define'
import type { IAdapterProfile } from '../../naming'
import { TExchange } from '../exchange/exchange.class'
import type { TMember } from '../exchange/member.class'
import { TSurface } from '../surface'
import type { IAdapterContext, IBundleTenancy, TAdapterEvents, TAnyExtensionCtor } from './types'

export class TAdapterContext<C extends IComponentContract> implements IAdapterContext<C> {
	readonly events = new TEvented<TAdapterEvents>()

	private readonly _extensions = new Map<TAnyExtensionCtor, unknown>()
	/** Пропсы сборки — до первого `connect()`. */
	private _props: object | undefined
	/** Обмен монтирования — его заводит первый `connect()`. */
	private _exchange: TExchange | undefined

	constructor(
		readonly descriptor: IComponentDescriptor,
		readonly instance: C['instance'],
		private readonly _tenancy: IBundleTenancy,
		private readonly _members: readonly TMember[],
		props: object,
		readonly embedded: string | undefined,
	) {
		this._props = props
	}

	get bundle(): IPluginBundle | null {
		return this._tenancy.bundle
	}

	get props(): object | undefined {
		return this._props
	}

	connect(profile: IAdapterProfile): TExchange {
		const surface = TSurface.of(this.descriptor, profile)
		const exchange = this._exchange ?? new TExchange(this._members, surface, this._props)

		if (exchange.surface !== surface) {
			throw new Error(
				`Обмен ${this.descriptor.ctor.name} уже заведён в другом профиле: одно монтирование — один фреймворк`,
			)
		}

		// Память входов завела свои ячейки: пропсы сборки больше никому не нужны
		this._exchange = exchange
		this._props = undefined

		return exchange
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

	attach(): void {
		this.events.emit('attach')
	}

	destroy(): void {
		this.events.emit('destroy')
		this._extensions.clear()
		this._tenancy.destroy()
	}
}
