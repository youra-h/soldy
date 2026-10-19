import { TVirtualExtension, VirtualDescriptor } from '@soldy-ui/setup'
import type { IVirtual } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupVirtual — setup-слой Virtual.
 *
 * Контекст обёртки и её проводка (`TVirtualExtension`): подключение к окну она
 * опускает лифтом — в слой обёртки (`provideElevator()` в её `providers`), — и
 * коллекция, собранная в её содержимом, подхватывает его своей сборкой
 * (`TVirtualCollectionExtension`). Сборка — в `ngOnInit` обёртки, а он идёт
 * раньше хуков её содержимого: Angular зовёт хуки в порядке шаблона.
 *
 * `useAdapter` — ради входа `enabled` и событий: узла у обёртки нет, и
 * привязывать к `TElementPlugin` нечего.
 */
export function setupVirtual(ctrl: IVirtual | undefined, props: object): TBinding<IVirtual> {
	const adapter = createAngularAdapterContext(VirtualDescriptor(), { ctrl, props }).use(
		TVirtualExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
