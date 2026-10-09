/**
 * TVirtualCollectionExtension — коллекция подхватывает окно обёртки `Virtual` над собой.
 *
 * Фазы — как у связки панели Tabs (`TTabsContentBindingExtension`):
 *
 * - **сборка** — подхват: подключение ставит то, что принадлежит коллекции, —
 *   плагин замера в её набор и стратегию в её рисование по текущему
 *   `enabled`. Сервер и первый кадр рисуют уже окно, а не весь список;
 * - **вход** (`attach` контекста) — подписка на выключатель обёртки. Шина
 *   обёртки чужая, а собранную коллекцию фреймворк вправе выбросить, так и не
 *   приняв: подписка сборки осталась бы на живой обёртке;
 * - **снятие** (`destroy` контекста) — отписка от обёртки, если подписка была,
 *   и рисование всех элементов, ведь движок мог прийти снаружи и пережить
 *   компонент. Контекст, собранный, но так и не принятый, снимается тоже.
 *
 * Обёртки выше нет — коллекция рисует все показанные элементы, как без окна.
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
		const connect = elevator.up()

		elevator.down(null)

		if (!connect) return

		const connection = connect(context.instance.engine, context.bundle)

		context.events.on('attach', () => connection.attach())
		context.events.on('destroy', () => connection.destroy())
	}
}
