import {
	MenuRadioGroupDescriptor,
	TItemGroupExtension,
	TMenuRadioGroupExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupMenuRadioGroup — setup-слой группы переключателей меню.
 *
 * Группа переключателей — та же группа меню и своё значение. Как группа меню,
 * она входит в группировку коллекции меню (`TItemGroupExtension`), а себя
 * переключателям внутри опускает проводкой (`TMenuRadioGroupExtension`) — оба
 * в свой слой лифта (`provideElevator()` в её `providers`). Что в группе
 * отмечен один, держит коллекция меню; значение группы — вход `value` и выход
 * `(soChangeValue)`.
 */
export function setupMenuRadioGroup(
	ctrl: IMenuRadioGroup | undefined,
	props: object,
): TBinding<IMenuRadioGroup> {
	const adapter = createAngularAdapterContext(MenuRadioGroupDescriptor(), { ctrl, props })
		.use(TItemGroupExtension, { elevator: AngularElevatorFactory })
		.use(TMenuRadioGroupExtension, { elevator: AngularElevatorFactory })

	return useAdapter(adapter)
}
