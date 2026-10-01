import { TActionEvent } from '../../../../../../common/event/action-event'
import type { IExtension, IExtensionItems } from '../types'
import type { IActivationItemExtension } from './item/types'

/**
 * Событие перед активацией: подписчик `item:activate:before` отменяет её
 * `preventDefault()` — элемент не становится активным, прежний остаётся.
 */
export class TActivateEvent<TItem> extends TActionEvent {
	constructor(public readonly item: TItem) {
		super()
	}
}

export type TActivationEvents<TItem> = {
	/** Элемент вот-вот станет активным; `preventDefault()` отменяет активацию */
	'item:activate:before': (e: TActivateEvent<TItem>) => void
	'change:activation': (item: TItem | undefined) => void
	'item:activated': (item: TItem) => void
	'item:deactivated': (item: TItem | undefined) => void
}

/** Контракт расширения активации. Реализуется TActivationExtension. */
export interface IActivationExtension<TItem extends object = any>
	extends
		IExtension<TItem, TActivationEvents<TItem>>,
		IExtensionItems<TItem, IActivationItemExtension<TItem>> {
	/** Текущий активный элемент (или undefined, если нет активного). */
	readonly activeItem: TItem | undefined

	/**
	 * Установить элемент активным.
	 * Предыдущий активный элемент деактивируется автоматически.
	 * Если элемент не принадлежит коллекции или активацию отменили в
	 * `item:activate:before` — ничего не делает.
	 *
	 * @returns активен ли элемент после вызова
	 */
	activate(item: TItem): boolean

	/** Деактивировать элемент, если он активен. */
	deactivate(item: TItem): void

	/** Переключить активность: если активен — деактивировать, иначе — активировать. */
	toggle(item: TItem): void

	/** Проверить, активен ли указанный элемент. */
	isActive(item: TItem): boolean

	/** Сбросить активный элемент (деактивировать без указания конкретного). */
	reset(): void

	/**
	 * Найти подходящий для активации элемент: сначала вперёд от `fromItem`,
	 * затем назад. Кого активировать взамен удалённого, расширение не решает
	 * само — поиск зовёт компонент, у которого такая политика есть.
	 */
	findActivatable(predicate?: (item: TItem) => boolean, fromItem?: TItem): TItem | undefined

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IActivationItemExtension<TItem>
}
