/**
 * setupListBox — setup-слой ListBox.
 *
 * Два контекста, как у Vue и Svelte: свой (`ListBoxDescriptor`) и фасада
 * коллекции (`ListBoxCollectionDescriptor`) на общем наборе. Оба собираются
 * один раз, при выполнении тела компонента; фасад делит набор списка, и id
 * монтирования у него списка.
 *
 * Расширения коллекции опускают движок и регистратор элементов в слой лифта
 * списка (`useElevator`), детям его отдаёт `Elevate` в разметке: элемент,
 * смонтированный внутри, прочтёт их при своей сборке и войдёт в коллекцию
 * списка. Окно обёртки `Virtual` над списком фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в слотах элементов окна не наследуют.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни список, ни фасад.
 */

import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { ListBoxProps } from './base.component'

export function setupListBox(props: ListBoxProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(ListBoxDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		ListBoxCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })
		// Окно обёртки `Virtual` над списком: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
