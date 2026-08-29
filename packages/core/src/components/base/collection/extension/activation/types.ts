import type { IExtension, IExtensionItems } from '../types'
import type { TEvented } from '@soldy/core'
import type { IActivationItemExtension } from './item/types'

export type TActivationEvents<TItem> = {
	'change:activation': (item: TItem | undefined) => void
	'item:activated': (item: TItem) => void
	'item:deactivated': (item: TItem | undefined) => void
}

/** Owner-level state коллекции от activation-расширения (output для refs). */
export interface IActivationProps<TItem extends object = any> {
	readonly activeItem: TItem | undefined
}

/** Контракт расширения активации. Реализуется TActivationExtension. */
export interface IActivationExtension<TItem extends object = any>
	extends IExtension<TItem, TActivationEvents<TItem>, IActivationProps<TItem>>, IExtensionItems<TItem, IActivationItemExtension<TItem>> {
	/** События расширения: change:activation, item:activated, item:deactivated. */
	readonly events: TEvented<TActivationEvents<TItem>>

	/** Текущий активный элемент (или undefined, если нет активного). */
	readonly activeItem: TItem | undefined

	/**
	 * Установить элемент активным.
	 * Предыдущий активный элемент деактивируется автоматически.
	 * Если элемент не принадлежит коллекции — ничего не делает.
	 */
	activate(item: TItem): void

	/** Деактивировать элемент, если он активен. */
	deactivate(item: TItem): void

	/** Переключить активность: если активен — деактивировать, иначе — активировать. */
	toggle(item: TItem): void

	/** Проверить, активен ли указанный элемент. */
	isActive(item: TItem): boolean

	/** Сбросить активный элемент (деактивировать без указания конкретного). */
	reset(): void

	/** @inheritdoc IExtensionItems.createItem */
	createItem(owner: TItem): IActivationItemExtension<TItem>
}
