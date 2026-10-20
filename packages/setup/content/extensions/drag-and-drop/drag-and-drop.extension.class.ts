/**
 * TDragAndDropExtension — проводка обёртки `DragAndDrop`: перестановка коллекциям внутри неё.
 *
 * Обёртка опускает по лифту свой экземпляр, а коллекция внутри подхватывает
 * его при сборке (`TDragAndDropCollectionExtension`) и включает им свой плагин
 * перетаскивания: жест коллекции становится командой обёртки
 * (`IDragAndDrop.move`), со своими событиями.
 *
 * Фаз контекста у проводки нет, в отличие от окна (`TVirtualExtension`): на
 * шину обёртки никто не подписан — плагин коллекции только зовёт её команду и
 * уходит вместе с набором коллекции.
 *
 * Использование:
 *   adapter.use(TDragAndDropExtension, { elevator: VueElevatorFactory })
 */

import type { IDragAndDrop } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { DRAG_AND_DROP_ELEVATOR } from './keys'
import type { IDragAndDropExtensionOptions } from './types'

export class TDragAndDropExtension {
	constructor(context: TInstanceContext<IDragAndDrop>, options: IDragAndDropExtensionOptions) {
		options.elevator(DRAG_AND_DROP_ELEVATOR).down(context.instance)
	}
}
