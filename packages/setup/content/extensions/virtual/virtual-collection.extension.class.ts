/**
 * TVirtualCollectionExtension — коллекция подхватывает окно обёртки `Virtual` над собой.
 *
 * Подхват — при сборке: сервер и первый кадр рисуют уже окно, а не весь
 * список. Снятие — на `destroy` контекста: отписка от обёртки и рисование всех
 * элементов, ведь движок мог прийти снаружи и пережить компонент. Обёртки
 * выше нет — коллекция рисует все показанные элементы, как без окна.
 *
 * Своему поддереву коллекция опускает пустое подключение: списки в слотах её
 * элементов окна не наследуют.
 *
 * Код окна здесь не импортируется — только ключ лифта и типы: коллекция без
 * обёртки стратегию окна и плагин замера в сборку приложения не тянет.
 *
 * Использование:
 *   adapter.use(TCollectionExtension, { elevator: VueElevatorFactory })
 *     .use(TVirtualCollectionExtension, { elevator: VueElevatorFactory })
 */

import type { TInstanceContext } from '../../../protected/adapter/context'
import type { TCollectionOwner } from '../collection'
import { VIRTUAL_ELEVATOR } from './keys'
import type { IVirtualCollectionExtensionOptions } from './types'

export class TVirtualCollectionExtension {
	constructor(
		context: TInstanceContext<TCollectionOwner>,
		options: IVirtualCollectionExtensionOptions,
	) {
		const elevator = options.elevator(VIRTUAL_ELEVATOR)
		const attach = elevator.up()

		elevator.down(null)

		if (!attach) return

		const detach = attach(context.instance.engine, context.bundle)

		context.events.on('destroy', detach)
	}
}
