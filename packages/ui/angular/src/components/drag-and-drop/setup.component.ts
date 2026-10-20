import { DragAndDropDescriptor, TDragAndDropExtension } from '@soldy-ui/setup'
import type { IDragAndDrop } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupDragAndDrop — setup-слой DragAndDrop.
 *
 * Контекст обёртки и её проводка (`TDragAndDropExtension`): свой экземпляр она
 * опускает лифтом — в слой обёртки (`provideElevator()` в её `providers`), — и
 * коллекция, собранная в её содержимом, подхватывает его своей сборкой
 * (`TDragAndDropCollectionExtension`). Сборка — в `ngOnInit` обёртки, а он идёт
 * раньше хуков её содержимого: Angular зовёт хуки в порядке шаблона.
 *
 * `useAdapter` — ради событий перестановки (`(soMoveBefore)`, `(soMove)`):
 * узла у обёртки нет, и привязывать к `TElementPlugin` нечего.
 */
export function setupDragAndDrop(
	ctrl: IDragAndDrop | undefined,
	props: object,
): TBinding<IDragAndDrop> {
	const adapter = createAngularAdapterContext(DragAndDropDescriptor(), { ctrl, props }).use(
		TDragAndDropExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
