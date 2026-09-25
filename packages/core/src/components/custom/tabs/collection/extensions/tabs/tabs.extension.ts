import type {
	IExtension,
	IExtensionContext,
	IActivationExtension,
	TRemoveEvent,
} from '../../../../../base/collection'
import {
	TBaseOwnerItemExtension,
	TItemContextRegistry,
	TRemoveCommand,
} from '../../../../../base/collection'
import type { ITabsItem } from '../../../item/types'
import type { ITabs } from '../../../types'
import type {
	TTabsExtensionEvents,
	ITabsExtensionOptions,
	TTabsExtensions,
	ITabsExtension,
} from './types'
import { TTabsItemExtension, type ITabsItemExtension } from './item'
import { bindDisabledToOwner, notifyOwnerDisabled } from '../../../../../base/control'
import { bindStyleToOwner, notifyOwnerSize, notifyOwnerVariant } from '../../../../../base/stylable'
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TTabsExtension — расширение коллекции для управления табами.
 *
 * Получает ссылку на инстанс TTabs через options.owner. `size` и `variant`
 * таб получает резольвером (`bindStyleToOwner`): их диктует набор, своё
 * значение таба остаётся в `rawValue` и на вид не влияет. `disabled` не
 * диктуется, а сочетается: таб выключен, если выключен сам или выключен
 * набор (`bindDisabledToOwner`).
 *
 * @template TOwner — тип владельца (TTabs или наследник)
 * @template TItem  — тип элемента таба (ITabsItem или наследник)
 */
export class TTabsExtension<TOwner extends ITabs = ITabs, TItem extends ITabsItem = ITabsItem>
	extends TBaseOwnerItemExtension<TItem, ITabsItemExtension<TItem>, TTabsExtensionEvents>
	implements IExtension<TItem>, ITabsExtension<TItem>
{
	readonly name = 'tabs' as const

	/**
	 * Ссылка на инстанс TTabs, переданная через конструктор.
	 * Используется для проброса свойств на элементы и подписки на события.
	 * @private
	 * @readonly
	 * @type {TOwner}
	 */
	private readonly _owner: TOwner
	private _itemRegistry!: TItemContextRegistry<TItem, TTabsExtensions<TItem>>

	/**
	 * Удаление активного таба и состав списка перед ним.
	 *
	 * Состав снимается в `item:remove:before` — после удаления место закрытого
	 * таба уже не узнать. Сосед выбирается в `item:removed`: в before-хуке
	 * удаление ещё могут отменить через `preventDefault()`, а пакетное удаление
	 * (`batch.remove`, патч) шлёт `item:removed` только после всех удалений —
	 * и сосед мог уйти той же операцией.
	 *
	 * Удаление узнаётся по объекту события, а не по элементу: команда шлёт один
	 * и тот же `TRemoveEvent` в оба хука, а отменённое удаление того же таба
	 * позже придёт с другим.
	 */
	private _pendingActivation?: { event: TRemoveEvent<TItem>; siblings: TItem[] }

	constructor(options: ITabsExtensionOptions<TOwner, TItem>) {
		super(TTabsItemExtension, options)

		this._owner = options.owner
	}

	/** Глобальный closable с инстанса TTabs. */
	get closable(): boolean {
		return this._owner.closable
	}

	override install(ctx: IExtensionContext<TItem>): void {
		super.install(ctx)

		// Реестр для доступа к item-адаптерам (кеширует через WeakMap)
		this._itemRegistry = new TItemContextRegistry({
			extensions: ctx.extensions as TTabsExtensions<TItem>,
			driver: ctx.driver,
		})

		// При добавлении элемента — пробрасываем текущие свойства владельца
		ctx.driver.events.on('item:added', (e) => this._applyOwner(e.item as TItem))

		// Догон: расширение приходит в коллекцию, которую могли наполнить
		// раньше — например, собрав её снаружи через `createEngine({ items })`.
		// Тем элементам `item:added` уже не придёт
		ctx.driver.valueOf().forEach((item) => this._applyOwner(item))

		// Итог `resolvedDisabled` элементу отдаёт резольвер по итогу владельца — сообщаем
		// тем, у кого он сменился
		this._owner.events.on('change:disabled:resolved', () =>
			notifyOwnerDisabled(ctx.driver.valueOf()),
		)

		// `size` и `variant` табу тоже отдаёт резольвер — сообщаем прежний итог,
		// по нему снимается старый класс
		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			notifyOwnerSize(ctx.driver.valueOf(), payload.oldValue)
		})

		this._owner.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				notifyOwnerVariant(ctx.driver.valueOf(), payload.oldValue)
			},
		)

		// Глобальный closable: пробрасываем change:closable в item-адаптеры
		// (TTabsItemExtension резолвит closable из item ?? owner).
		this.events.relay(this._owner.events, ['change:closable'])

		// `aria-selected` пишется сюда, а не в TActivationExtension: то
		// расширение общее для всех коллекций, а «выбранность» выражается
		// по-разному — у таба это `aria-selected`, у заголовка Accordion
		// `aria-expanded`. Атрибут знает паттерн, а не механизм активации.
		const activation = this._activation

		if (activation) {
			activation.events.on('change:activation', () => this._syncSelectedAria())

			ctx.driver.events.on('item:added', () => this._syncSelectedAria())

			// Закрыли активный таб — активным становится сосед: иначе в списке не
			// останется ни активного таба, ни панели. Это политика Tabs, а не
			// активации: общее расширение на удаление активного только сбрасывает.
			ctx.driver.events.on('item:remove:before', (e) => {
				this._dropCancelledActivation()

				if (!activation.isActive(e.item)) return

				this._pendingActivation = { event: e, siblings: [...ctx.driver.valueOf()] }
			})

			ctx.driver.events.on('item:removed', (e) => {
				this._dropCancelledActivation()

				const pending = this._pendingActivation

				if (pending?.event === e) {
					this._pendingActivation = undefined

					const next = this._findNeighbour(pending.siblings, e.item)

					if (next) activation.activate(next)
				}

				this._syncSelectedAria()
			})

			this._syncSelectedAria()
		}

		// Остановка Tab зависит от активного таба, от состава и порядка списка
		// и от того, можно ли перейти на каждый таб. `change:items` приходит
		// один раз на команду — после всех `item:*`, в том числе после
		// активации соседа закрытого таба
		ctx.driver.valueOf().forEach((item) => this._watchTab(item))
		ctx.driver.events.on('item:added', (e) => this._watchTab(e.item as TItem))
		ctx.driver.events.on('item:removed', (e) => this._unwatchTab(e.item as TItem))
		ctx.driver.events.on('change:items', () => this._syncTabStop())
		activation?.events.on('change:activation', () => this._syncTabStop())

		this._syncTabStop()
	}

	private get _activation(): IActivationExtension<TItem> | undefined {
		return this._ctx.extensions.activation as IActivationExtension<TItem> | undefined
	}

	/**
	 * Свойства владельца, которые таб получает от него, а не задаёт сам.
	 *
	 * Расширение их не пишет: `size` и `variant` диктует набор
	 * (`bindStyleToOwner`), `disabled` таб сочетает со своим
	 * (`bindDisabledToOwner`). Итог в обоих случаях отдаёт резольвер.
	 */
	private _applyOwner(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		bindStyleToOwner(item, this._owner)
	}

	/**
	 * Проставляет `aria-selected` каждому табу.
	 *
	 * У неактивных стоит `"false"`, а не отсутствует: в паттерне вкладок
	 * скринридер объявляет «1 из 5, не выбрана», и для этого атрибут должен
	 * быть на всех табах набора.
	 */
	private _syncSelectedAria(): void {
		const activation = this._activation

		if (!activation) return

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-selected', activation.isActive(item) ? 'true' : 'false')
		})
	}

	/**
	 * Таб, который держит остановку Tab.
	 *
	 * Активный — если на него можно перейти, иначе первый такой по порядку:
	 * активного таба может не быть вовсе (активирует только `meta.active` или
	 * код), а выключенный активный не получит фокус. Нет ни одного таба, на
	 * который можно перейти, — нет и остановки.
	 */
	get tabStop(): TItem | undefined {
		const active = this._activation?.activeItem

		if (active && this.isEnabledTab(active)) return active

		return this._ctx.driver.valueOf().find((item) => this.isEnabledTab(item))
	}

	/**
	 * Roving tabindex по паттерну APG Tabs: весь список — одна остановка Tab,
	 * `tabindex="0"` только у `tabStop`, у остальных `-1`. Между табами ходят
	 * стрелки (`TTabsKeyboardPlugin`), а Tab из списка уводит сразу к панели.
	 *
	 * Пишет родительское расширение, а не плагин: атрибут обязан стоять с
	 * первой отрисовки, включая серверную, а плагин узнаёт о разметке только
	 * после монтирования.
	 */
	private _syncTabStop(): void {
		const stop = this.tabStop

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('tabindex', item === stop ? '0' : '-1')
		})
	}

	/** Повод пересчитать остановку: сменилось, можно ли перейти на таб. */
	private readonly _onTabAvailability = (): void => this._syncTabStop()

	private _watchTab(item: TItem): void {
		item.events.on('change:disabled:resolved', this._onTabAvailability)
		item.events.on('change:visible', this._onTabAvailability)
		item.events.on('change:rendered', this._onTabAvailability)
	}

	/** Удалённый таб больше не двигает остановку списка, в котором его нет. */
	private _unwatchTab(item: TItem): void {
		item.events.off('change:disabled:resolved', this._onTabAvailability)
		item.events.off('change:visible', this._onTabAvailability)
		item.events.off('change:rendered', this._onTabAvailability)
	}

	/**
	 * Проверяет, есть ли в коллекции хотя бы один элемент, который одновременно:
	 * - не disabled
	 * - visible
	 * - rendered
	 *
	 * @returns true, если есть хотя бы один такой элемент, иначе false
	 */
	hasEnabledTabs(): boolean {
		return this._ctx.driver.valueOf().some((item) => this.isEnabledTab(item))
	}

	/**
	 * Таб, на который можно перейти: не disabled, visible и rendered.
	 *
	 * Публичный, потому что правило одно на всех: по нему считаются остановка
	 * Tab, сосед закрытого таба и навигация с клавиатуры. Копия в плагине
	 * однажды разошлась бы с остановкой.
	 */
	isEnabledTab(item: TItem): boolean {
		return !item.resolvedDisabled && item.visible && item.rendered
	}

	/**
	 * Ближайший к закрытому табу годный таб, оставшийся в списке: сначала
	 * справа, затем слева. `siblings` — состав до удаления, в нём у закрытого
	 * ещё есть место.
	 */
	private _findNeighbour(siblings: TItem[], removed: TItem): TItem | undefined {
		const present = new Set(this._ctx.driver.valueOf())
		const index = siblings.indexOf(removed)
		const available = (item: TItem) => present.has(item) && this.isEnabledTab(item)

		return (
			siblings.slice(index + 1).find(available) ??
			siblings.slice(0, index).reverse().find(available)
		)
	}

	/**
	 * Отменённое удаление `item:removed` не пришлёт никогда. Отмену видно
	 * только постфактум, поэтому запись сверяется на следующем событии удаления.
	 */
	private _dropCancelledActivation(): void {
		if (this._pendingActivation?.event.defaultPrevented) this._pendingActivation = undefined
	}

	/**
	 * Закрыть таб (удалить элемент из коллекции).
	 * Если таб нельзя закрыть — ничего не делает. Решает `closable` его
	 * item-адаптера, то же, что видит разметка: выключенный таб не закрывается.
	 * @param item
	 * @returns true, если элемент был удалён, иначе false
	 */
	closeTab(item: ITabsItem): boolean {
		const { tabs } = this._itemRegistry.get(item as TItem).adapters

		if (!tabs.closable) return false

		this.events.emit('item:close', item as TItem)

		this._ctx.execute(new TRemoveCommand(item as TItem))

		return true
	}
}
