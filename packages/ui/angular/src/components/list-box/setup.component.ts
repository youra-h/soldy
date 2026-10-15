import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import type { IListBox, IListBoxProps, TListBoxCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupListBox — setup-слой ListBox.
 *
 * Два контекста, как у Vue и Svelte: свой (`ListBoxDescriptor`) и фасада
 * коллекции (`ListBoxCollectionDescriptor`) на общем наборе. Оба собираются
 * один раз, в `ngOnInit`, в контексте инъекции списка, и база получает их
 * одной связкой (`joinBindings`).
 *
 * Расширения коллекции опускают движок и регистратор элементов лифтом — в
 * слой списка (`provideElevator()` в его `providers`): элемент, собранный
 * внутри, прочтёт их при своей сборке и войдёт в коллекцию списка. Окно обёртки
 * `Virtual` над списком фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в слотах элементов окна не наследуют.
 *
 * `engine` — готовая коллекция снаружи, вход списка. Дали — фасад работает на
 * ней и своей не создаёт, лишь доложит недостающие расширения в неё же. Не
 * дали — соберёт свою. Развилка в `completeEngine`.
 */
export function setupListBox(
	ctrl: IListBox | undefined,
	props: object,
	engine: IListBoxProps['engine'],
): TBinding<IListBox, TListBoxCollectionFacade> {
	const adapter = createAngularAdapterContext(ListBoxDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		ListBoxCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		.use(TDragAndDropCollectionExtension, { elevator: AngularElevatorFactory })
		// Окно обёртки `Virtual` над списком: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
