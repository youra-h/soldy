import { TComponent } from '../../base/component'
import type { TDefaultValues } from '../../base/component'
import { batchOf, plainOf } from '../../base/collection'
import type { TCollectionEngine } from '../../base/collection'
import { TDragAndDropMoveEvent } from './move-event'
import type { IDragAndDrop, IDragAndDropProps, TDragAndDropEvents } from './types'

/**
 * Перестановка элементов коллекций перетаскиванием — невизуальная обёртка.
 *
 * Коллекции внутри обёртки (Tabs, ListBox, Accordion) переставляют свои
 * элементы жестом: жест DOM переводит в команду плагин коллекции, а
 * перестановка — команда обёртки (`move`), со своими событиями, как
 * `moveColumn` у таблицы. Поэтому о перестановке пользователя сообщает одна
 * точка на все коллекции обёртки, а о любом перемещении, и из кода, — движок
 * коллекции (`item:move:before`, `item:moved`).
 *
 * Обёртка не знает, какие коллекции стоят внутри: коллекцию и элемент ей
 * называет тот, кто переставляет. Между коллекциями она не переносит —
 * элемент переставляется в своей.
 */
export default class TDragAndDrop
	extends TComponent<IDragAndDropProps, TDragAndDropEvents>
	implements IDragAndDrop
{
	static defaultValues: typeof TComponent.defaultValues & TDefaultValues<IDragAndDropProps> = {
		...TComponent.defaultValues,
	}

	constructor(props: Partial<IDragAndDropProps> = {}) {
		super(props)
	}

	canMove(engine: TCollectionEngine<any, any>, item: object): boolean {
		return placeOf(engine, item) !== -1 && !isDisabled(item)
	}

	move(engine: TCollectionEngine<any, any>, item: object, newIndex: number): boolean {
		// Правило «можно взять» — одно: наследник, который его сузил, сужает и команду
		if (!this.canMove(engine, item)) return false

		const items = batchOf<object>(engine)?.items ?? []
		const oldIndex = items.indexOf(item)

		if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= items.length) return false
		if (newIndex === oldIndex) return false

		const event = new TDragAndDropMoveEvent(engine, item, oldIndex, newIndex)

		this.events.emit('move:before', event)

		if (event.defaultPrevented) return false

		// Место перед перемещением — заново: подписчик `move:before` мог тронуть состав
		const before = placeOf(engine, item)

		if (before === -1) return false

		plainOf<object>(engine)?.move(item, newIndex, before)

		const after = placeOf(engine, item)

		// Перемещение отменил или вернул на место хук движка `item:move:before`
		if (after === before) return false

		this.events.emit('move', { engine, item, oldIndex: before, newIndex: after })

		return true
	}
}

/** Место элемента в составе коллекции; нет его там — `-1`. */
function placeOf(engine: TCollectionEngine<any, any>, item: object): number {
	return batchOf<object>(engine)?.items.indexOf(item) ?? -1
}

/**
 * Элемент выключен. Тип элемента обёртке неизвестен — коллекции у неё любые,
 * — поэтому проверка по свойству, а не по классу: у элементов Tabs, ListBox и
 * Accordion `disabled` есть всегда, у элемента без него выключать нечего.
 */
function isDisabled(item: object): boolean {
	return 'disabled' in item && item.disabled === true
}
