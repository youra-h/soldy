/**
 * TExternalPlugins — плагины, поставленные снаружи: владелец пропа `pluginProps` и источник `plugin:event`.
 *
 * Поверхность компонента объявляет только дескриптор, и внешний плагин в неё
 * не попадает: статический слой объявляет её раньше регистрации, а поставить
 * плагин можно и после монтирования. Поэтому на все внешние плагины у
 * компонента один проп (`pluginProps`) и одно событие (`plugin:event`).
 *
 * Своих правил записи, сброса и проброса у класса нет. На каждый пришедший
 * плагин с контрактом он заводит тот же `TExchange`, что обслуживает компонент,
 * — только «фреймворком» для него служит мешок `pluginProps` (общий профиль
 * имён), а приёмником событий — конверт на шине инстанса. Поэтому «правила
 * записи — те же, что у пропсов компонента» выполняется не дисциплиной, а тем,
 * что код один: «ключ пропал из мешка — проп вернулся к умолчанию» — обычное
 * поведение полного набора.
 *
 * Путь один, когда бы плагин ни встал: реестр ставит плагины через
 * `bundle.use` уже после того, как этот класс подписался на набор, и они
 * приходят тем же событием `use`, что и плагин из обработчика `bundle:create`.
 *
 * Для обмена компонента этот объект — обычный участник: у него есть свойство
 * `pluginProps`, и линия пишет в него обычным сеттером. Ветки «а если это
 * pluginProps» в порту входов нет.
 */

import type { IEventEmitter, TEventListener, TPluginEvent } from '@soldy-ui/core'
import type { IPlugin, IPluginBundle, TPluginBundleEvents } from '@soldy-ui/plugins'
import { pluginContractOf } from '../../define'
import type { TPluginCtor } from '../../define'
import { CommonProfile } from '../../naming'
import { TCell } from '../exchange/cell.class'
import { TExchange } from '../exchange/exchange.class'
import { TInputPort } from '../exchange/input-port.class'
import { TMember } from '../exchange/member.class'
import { sameValue } from '../exchange/value'
import { TSurface } from '../surface'

function hasEmit(value: unknown): value is Pick<IEventEmitter, 'emit'> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'emit' in value &&
		typeof value.emit === 'function'
	)
}

export class TExternalPlugins {
	/** Умолчание `pluginProps`: снятый проп возвращает плагины к их умолчаниям. */
	static readonly defaultValues = { pluginProps: {} }

	private readonly _bag = new TCell<object>({}, sameValue)
	/** Отвязки плагинов, поставленных снаружи, — с первого такого плагина. */
	private _detach?: Map<TPluginCtor, () => void>
	/** Отписка от набора. */
	private readonly _unlisten: () => void

	/**
	 * @param _own плагины дескриптора: через `pluginProps` они не пишутся — их пропсы уже в поверхности
	 */
	constructor(
		bundle: IPluginBundle,
		private readonly _instance: object,
		private readonly _own: ReadonlySet<TPluginCtor>,
	) {
		// Один слушатель на шину, а не подписка на каждое событие: подписке набор
		// заводит карту и по набору обработчиков на событие, слушателю — нет
		this._unlisten = bundle.events.listen(this._onBundle)
	}

	get pluginProps(): object {
		return this._bag.value
	}

	set pluginProps(bag: object) {
		this._bag.set(bag)
	}

	destroy(): void {
		this._unlisten()

		const detach = this._detach

		this._detach = undefined

		for (const off of detach?.values() ?? []) off()
	}

	private readonly _onBundle: TEventListener<TPluginBundleEvents> = (event, [ctor, plugin]) => {
		if (event === 'use') this._use(ctor, plugin)
		else this._remove(ctor)
	}

	private _use(ctor: TPluginCtor, plugin: IPlugin<any, any>): void {
		if (this._own.has(ctor)) return

		this._detach?.get(ctor)?.()

		const contract = pluginContractOf(ctor)

		// Плагин без объявленного контракта работает, но значений не получает и событий не шлёт
		if (!contract) return

		// Описание участника — контракт класса: таблица маршрутов одна на все его установки
		const member = new TMember(plugin, contract)
		// Значения, пришедшие раньше плагина, ждали его в мешке: для него это пропсы сборки
		const bag = this._bag.value
		const surface = TSurface.of(contract, CommonProfile)
		const exchange = new TExchange([member], surface, bag)

		TInputPort.seed([member], surface, bag)

		const offBag = this._bag.listen((bag) => exchange.inputs.full(bag))
		const offEvents = exchange.events.listen((name, args) => this._announce({ name, args }))

		this._detach ??= new Map()
		this._detach.set(ctor, () => {
			offBag()
			offEvents()
		})
	}

	private _remove(ctor: TPluginCtor): void {
		this._detach?.get(ctor)?.()
		this._detach?.delete(ctor)
	}

	/** Конверт — на шину инстанса: его видят и адаптер, и тот, у кого на руках только `ctrl`. */
	private _announce(event: TPluginEvent): void {
		const bus: unknown = Reflect.get(this._instance, 'events')

		if (hasEmit(bus)) bus.emit('plugin:event', event)
	}
}
