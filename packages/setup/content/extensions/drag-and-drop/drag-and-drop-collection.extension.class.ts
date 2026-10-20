/**
 * TDragAndDropCollectionExtension — коллекция подхватывает обёртку `DragAndDrop` над собой.
 *
 * Обёртку опускает по лифту её проводка (`TDragAndDropExtension`). Коллекция
 * берёт её при сборке и включает плагин перетаскивания своего набора
 * (`TDragPlugin`) — своим движком и обёрткой: жест плагин переводит в команду
 * обёртки (`IDragAndDrop.move`), и о перестановке сообщают её события.
 *
 * Обёртки выше нет — коллекция не перетаскивается.
 *
 * Своему поддереву коллекция опускает пустое значение: списки в её элементах
 * (ListBox в секции Accordion) перестановку не наследуют.
 *
 * Фаз контекста у подхвата нет: на шину обёртки коллекция не подписывается,
 * а плагин уходит вместе с её набором.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: VueElevatorFactory })
 *     .use(TDragAndDropCollectionExtension, { elevator: VueElevatorFactory })
 */

import { TDragPlugin } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import type { TCollectionOwner } from '../collection'
import { DRAG_AND_DROP_ELEVATOR } from './keys'
import type { IDragAndDropCollectionExtensionOptions } from './types'

export class TDragAndDropCollectionExtension {
	constructor(
		context: TInstanceContext<TCollectionOwner>,
		options: IDragAndDropCollectionExtensionOptions,
	) {
		const elevator = options.elevator(DRAG_AND_DROP_ELEVATOR)
		const dragAndDrop = elevator.up()

		elevator.down(null)

		if (!dragAndDrop) return

		context.bundle?.get(TDragPlugin)?.activate(context.instance.engine, dragAndDrop)
	}
}
