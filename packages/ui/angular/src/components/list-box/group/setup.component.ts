import { ListBoxGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupListBoxGroup — setup-слой группы ListBox.
 *
 * Контекст один: в коллекцию группа не входит, её элементы — элементы списка,
 * и движок они читают из слоя лифта списка сквозь группу.
 *
 * В группировку списка группа входит своей проводкой (`TItemGroupExtension`):
 * ключ группы она опускает элементам внутри в свой слой лифта
 * (`provideElevator()` в её `providers`), а подпись регистрирует в
 * группировке. Сборка — в `ngOnInit` группы, а он идёт раньше хуков её
 * содержимого: элемент, собранный внутри, прочтёт ключ при своей.
 */
export function setupListBoxGroup(
	ctrl: IItemGroup | undefined,
	props: object,
): TBinding<IItemGroup> {
	const adapter = createAngularAdapterContext(ListBoxGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
