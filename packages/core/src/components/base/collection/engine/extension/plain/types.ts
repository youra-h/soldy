import type { TCollectionStorageDriverEvents } from '../../types'
import type { IExtension } from '../types'

/**
 * События расширения базовых операций — карта драйвера целиком.
 *
 * `plain` не эмитит ничего сам, он `relayAll`-ом отдаёт наружу события
 * хранилища. Поэтому карта не перечисляет имена, а ссылается на источник:
 * новое событие драйвера появляется здесь само. Перечисление разошлось бы —
 * до перехода на `relayAll` карта обещала `items:query:before` и
 * `items:query:invalidated`, а проброс их не передавал, и подписка на них
 * не срабатывала никогда.
 */
export type TPlainEvents<TItem extends object = any> = TCollectionStorageDriverEvents<TItem>

/**
 * Контракт расширения базовых операций — по одному элементу. Реализуется
 * TPlainExtension. Замена набора целиком — у `batch`.
 */
export interface IPlainExtension<TItem extends object = any> extends IExtension<
	TItem,
	TPlainEvents<TItem>
> {
	/** Вставить элемент на место `index`, по умолчанию — в начало. */
	insert(item: Partial<TItem>, index?: number): TItem

	/** Вставить элемент в конец коллекции. */
	push(item: Partial<TItem>): TItem

	/** Удалить элемент из коллекции. */
	remove(item: TItem): void

	/** Обновить элемент: записать ему `changes`. */
	update(item: TItem, changes: Partial<TItem>): void

	/**
	 * Переместить элемент на место `newIndex`. Старое место — из состава;
	 * место вне состава и элемент не из коллекции — no-op без событий.
	 */
	move(item: TItem, newIndex: number): void
}
