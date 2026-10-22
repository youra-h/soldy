import { MenuGroupDescriptor, TItemGroupExtension } from '@soldy-ui/setup'
import type { IItemGroup } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupMenuGroup — setup-слой группы меню.
 *
 * Контекст один: в коллекцию группа не входит, её пункты — пункты меню, и
 * движок они читают из слоя лифта меню сквозь группу, а навигация ходит по ним,
 * как по одному списку.
 *
 * В группировку коллекции меню группа входит своей проводкой
 * (`TItemGroupExtension`): ключ группы она опускает пунктам внутри в свой слой
 * лифта (`provideElevator()` в её `providers`), а подпись регистрирует в
 * группировке. Сборка — в `ngOnInit` группы, а он идёт раньше хуков её
 * содержимого: пункт, собранный внутри, прочтёт ключ при своей. Пункты подменю
 * в группе ключа не берут — они элементы коллекции подменю.
 */
export function setupMenuGroup(ctrl: IItemGroup | undefined, props: object): TBinding<IItemGroup> {
	const adapter = createAngularAdapterContext(MenuGroupDescriptor(), { ctrl, props }).use(
		TItemGroupExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
