import type { IComponent, IComponentProps, TComponentEvents } from '../../base/component'
import type { TCollectionEngine } from '../../base/collection'
import type { TDragAndDropMoveEvent } from './move-event'

export interface IDragAndDropProps extends IComponentProps {}

/**
 * Перестановка жестом: чья коллекция, какой элемент и откуда куда.
 *
 * Места — в составе коллекции (`batch.items`), как у `TMoveEvent` движка:
 * `newIndex` — место, на котором элемент стоит после перестановки.
 */
export interface IDragAndDropMove {
	/** Коллекция, в которой переставляют */
	readonly engine: TCollectionEngine<any, any>
	/** Переставляемый элемент */
	readonly item: object
	/** Место элемента до перестановки */
	readonly oldIndex: number
	/** Место элемента после перестановки */
	readonly newIndex: number
}

/**
 * События перестановки — пара на каждое перемещение жестом: перестановка
 * живая, и жест через три места даёт три пары. Только о жесте и одной точкой
 * на все коллекции обёртки: о любом перемещении, и из кода, сообщает движок
 * коллекции (`item:move:before`, `item:moved`).
 */
export type TDragAndDropEvents = TComponentEvents & {
	/**
	 * Пользователь переставляет элемент жестом: `preventDefault()` оставляет
	 * его на месте. Место только для чтения — подменить его можно хуком движка
	 * `item:move:before`
	 */
	'move:before': (e: TDragAndDropMoveEvent) => void
	/**
	 * Элемент переставлен жестом — с местом, где он встал. Перемещение,
	 * отменённое хуком движка, события не даёт
	 */
	move: (e: IDragAndDropMove) => void
}

export interface IDragAndDrop extends IComponent<IDragAndDropProps, TDragAndDropEvents> {
	/**
	 * Пользователь вправе взять элемент: он в составе коллекции и не выключен.
	 * Правило о том, кого берут, а не куда ставят: мимо выключенного элемента
	 * остальные проходят
	 */
	canMove(engine: TCollectionEngine<any, any>, item: object): boolean

	/**
	 * Переставить элемент на место `newIndex` в составе коллекции — перестановка
	 * пользователя, с событиями `move:before` и `move`. Элемент, которого взять
	 * нельзя (`canMove`), то же место и место вне состава — без перестановки и
	 * без событий.
	 *
	 * @returns сдвинулся ли элемент
	 */
	move(engine: TCollectionEngine<any, any>, item: object, newIndex: number): boolean
}
