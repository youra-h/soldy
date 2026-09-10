import type {
	IExtension,
	IExtensionContext,
	IActivationExtension,
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
import type { TComponentSize, TComponentVariant, TValuePayload } from '../../../../../../common'

/**
 * TTabsExtension — расширение коллекции для управления табами.
 *
 * Получает ссылку на инстанс TTabs через options.owner и автоматически
 * пробрасывает свойства (disabled, size, variant) на добавляемые элементы,
 * а также подписывается на изменения владельца для синхронизации.
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
		ctx.driver.forEach((item) => this._applyOwner(item))

		// При изменении свойств владельца — пробрасываем на все элементы
		this._owner.events.on('change:disabled', (value: boolean) => {
			ctx.driver.forEach((item) => {
				item.disabled = value
			})
		})

		this._owner.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			ctx.driver.forEach((item) => {
				item.size = payload.newValue
			})
		})

		this._owner.events.on('change:variant', (payload: TValuePayload<TComponentVariant>) => {
			ctx.driver.forEach((item) => {
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
			ctx.driver.events.on('item:removed', () => this._syncSelectedAria())

			this._syncSelectedAria()
		}
	}

	/**
	 * Проставляет `aria-selected` каждому табу.
	 *
	 * У неактивных стоит `"false"`, а не отсутствует: в паттерне вкладок
	 * скринридер объявляет «1 из 5, не выбрана», и для этого атрибут должен
	 * быть на всех табах набора.
	 */
	/** Свойства владельца, которые элемент получает от него, а не задаёт сам. */
	private _applyOwner(item: TItem): void {
		item.disabled = this._owner.disabled
		item.size = this._owner.size
		item.variant = this._owner.variant
	}

	private _syncSelectedAria(): void {
		const activation = this._ctx.extensions.activation as
			| IActivationExtension<TItem>
			| undefined

		if (!activation) return

		this._ctx.driver.forEach((item) => {
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
		return this._ctx.driver.some((item) => !item.disabled && item.visible && item.rendered)
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
