import { SelectGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupSelectGroup — setup-слой группы опций Select.
 *
 * Контекст один: в коллекцию группа не входит, её опции — опции Select, и
 * движок они читают из слоя лифта Select сквозь группу.
 *
 * В группировку Select группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает опциям внутри в свой слой лифта
 * (`provideElevator()` в её `providers`), а подпись регистрирует в
 * группировке. Сборка — в `ngOnInit` группы, а он идёт раньше хуков её
 * содержимого: опция, собранная внутри, прочтёт ключ при своей.
 */
export function setupSelectGroup(
	ctrl: IItemGroup | undefined,
	props: object,
): TBinding<IItemGroup> {
	const adapter = createAngularAdapterContext(SelectGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
