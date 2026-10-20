/**
 * TMenuRadioItemExtension — переключатель `Menu.RadioItem` берёт группу переключателей над собой.
 *
 * Группу опускает по лифту `Menu.RadioGroup` (`TMenuRadioGroupExtension`), и
 * переключатель пишет её себе в `group` при сборке: это его свойство, а в
 * коллекцию меню он входит позже, с приёмом (`attach`), — и меню застаёт его
 * уже в группе. Лифт отдаёт ближайшую группу.
 *
 * Группы выше нет — переключатель остаётся со своей: вне разметки группы
 * `null`, а у `ctrl`, которому группу дал код, — она.
 *
 * Использование:
 *   adapter.use(TMenuRadioItemExtension, { elevator: VueElevatorFactory })
 */

import type { IMenuRadioItem } from '@soldy-ui/core'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { MENU_RADIO_GROUP_ELEVATOR } from './keys'
import type { IMenuRadioItemExtensionOptions } from './types'

export class TMenuRadioItemExtension {
	constructor(
		context: TInstanceContext<IMenuRadioItem>,
		options: IMenuRadioItemExtensionOptions,
	) {
		const group = options.elevator(MENU_RADIO_GROUP_ELEVATOR).up()

		if (group) context.instance.group = group
	}
}
