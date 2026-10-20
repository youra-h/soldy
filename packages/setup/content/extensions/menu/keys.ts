/**
 * Ключ лифта группы переключателей меню: `Menu.RadioGroup` опускает по нему себя, а переключатель внутри её берёт.
 *
 * Лежит отдельно от проводки, как ключ окна (`VIRTUAL_ELEVATOR`): лифт берёт
 * любой ключ, поэтому ключ — в наполнении, а не в механике лифта.
 */

import type { IMenuRadioGroup } from '@soldy-ui/core'
import type { IElevatorKey } from '../../../protected/adapter/elevator'

/** Ближайшая группа переключателей выше по дереву. */
export const MENU_RADIO_GROUP_ELEVATOR: IElevatorKey<IMenuRadioGroup> = {
	name: 'soldy:menu-radio-group',
}
