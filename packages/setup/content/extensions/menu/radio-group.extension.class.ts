/**
 * TMenuRadioGroupExtension — проводка группы переключателей `Menu.RadioGroup`: группа переключателям внутри себя.
 *
 * Группа опускает по лифту (`MENU_RADIO_GROUP_ELEVATOR`) себя, а переключатель
 * внутри подхватывает её своим расширением (`TMenuRadioItemExtension`) — при
 * сборке, до входа в коллекцию меню: меню отмечает его по значению группы уже
 * на входе. Ни регистрации, ни подписок у группы нет, поэтому фаз контекста
 * она не ждёт: правило «в группе отмечен один» и значение группы за отметкой
 * держит расширение коллекции меню, пока переключатель группы в ней.
 *
 * Своей коллекции у группы нет: её переключатели — пункты меню, и навигация
 * ходит по ним сквозь группу.
 *
 * Использование:
 *   adapter.use(TMenuRadioGroupExtension, { elevator: VueElevatorFactory })
 */

import type { IMenuRadioGroup } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { MENU_RADIO_GROUP_ELEVATOR } from './keys'
import type { IMenuRadioGroupExtensionOptions } from './types'

export class TMenuRadioGroupExtension {
	constructor(
		context: TInstanceContext<IMenuRadioGroup>,
		options: IMenuRadioGroupExtensionOptions,
	) {
		options.elevator(MENU_RADIO_GROUP_ELEVATOR).down(context.instance)
	}
}
