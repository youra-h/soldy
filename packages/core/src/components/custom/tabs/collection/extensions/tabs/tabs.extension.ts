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
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TTabsExtension — расширение коллекции для управления табами.
 *
 * Получает ссылку на инстанс TTabs через options.owner и автоматически
 * пробрасывает свойства (size, variant) на добавляемые элементы, а также
 * подписывается на изменения владельца для синхронизации. `disabled` не
 * пробрасывается, а сочетается: таб выключен, если выключен сам или выключен
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

		// Итог `disabled` элементу отдаёт резольвер — сообщаем тем, у кого он сменился
		this._owner.events.on('change:disabled', () => notifyOwnerDisabled(ctx.driver.valueOf()))

		// При изменении свойств владельца — пробрасываем на все элементы
		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.driver.valueOf().forEach((item) => {
				item.variant = payload.newValue
			})
		})

		// Глобальный closable: пробрасываем change:closable в item-адаптеры
		// (TTabsItemExtension резолвит closable из item ?? owner).
		this.events.relay(this._owner.events, ['change:closable'])

		// `aria-selected` пишется сюда, а не в TActivationExtension: то
		// расширение общее для всех коллекций, а «выбранность» выражается
		// по-разному — у таба это `aria-selected`, у заголовка Accordion
		// `aria-expanded`. Атрибут знает паттерн, а не механизм активации.
		const activation = ctx.extensions.activation as IActivationExtension<TItem> | undefined

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
	}

	/**
	 * Свойства владельца, которые элемент получает от него, а не задаёт сам, —
	 * кроме `disabled`: его элемент сочетает со своим.
	 */
	private _applyOwner(item: TItem): void {
		bindDisabledToOwner(item, this._owner)
		item.size = this._owner.size
		item.variant = this._owner.variant
	}

	/**
	 * Проставляет `aria-selected` каждому табу.
	 *
	 * У неактивных стоит `"false"`, а не отсутствует: в паттерне вкладок
	 * скринридер объявляет «1 из 5, не выбрана», и для этого атрибут должен
	 * быть на всех табах набора.
	 */
	private _syncSelectedAria(): void {
		const activation = this._ctx.extensions.activation as
			| IActivationExtension<TItem>
			| undefined

		if (!activation) return

		this._ctx.driver.valueOf().forEach((item) => {
			item.aria.add('aria-selected', activation.isActive(item) ? 'true' : 'false')
		})
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
		return this._ctx.driver.valueOf().some((item) => this._isEnabledTab(item))
	}

	/** Таб, на который можно перейти: не disabled, visible и rendered. */
	private _isEnabledTab(item: TItem): boolean {
		return !item.disabled && item.visible && item.rendered
	}

	/**
	 * Ближайший к закрытому табу годный таб, оставшийся в списке: сначала
	 * справа, затем слева. `siblings` — состав до удаления, в нём у закрытого
	 * ещё есть место.
	 */
	private _findNeighbour(siblings: TItem[], removed: TItem): TItem | undefined {
		const present = new Set(this._ctx.driver.valueOf())
		const index = siblings.indexOf(removed)
		const available = (item: TItem) => present.has(item) && this._isEnabledTab(item)

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
	 * Если элемент не является closable — ничего не делает.
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
