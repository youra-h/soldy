/**
 * setupListBox — setup-слой ListBox.
 *
 * Два контекста, как у Vue: свой (`ListBoxDescriptor`) и фасада коллекции
 * (`ListBoxCollectionDescriptor`) на общем наборе. Оба собираются один раз,
 * при инициализации компонента, с тем же id монтирования (`$props.id()`):
 * фасад делит набор списка, и id у него списка.
 *
 * Расширения коллекции опускают движок и регистратор элементов лифтом
 * (`setContext`): элемент, смонтированный внутри, прочтёт их при своей
 * инициализации и войдёт в коллекцию списка. Окно обёртки `Virtual` над
 * списком фасад подхватывает тем же лифтом (`TVirtualCollectionExtension`),
 * а своему поддереву опускает пустое подключение: списки в слотах элементов
 * окна не наследуют.
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
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { ListBoxProps } from './base.component'

export function setupListBox(getProps: () => ListBoxProps, mountId: string) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(ListBoxDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps)

	const collectionAdapter = createSvelteAdapterContext(
		ListBoxCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: SvelteElevatorFactory })
		.use(TDragAndDropCollectionExtension, { elevator: SvelteElevatorFactory })
		// Окно обёртки `Virtual` над списком: подхват при сборке, подписка на
		// обёртку — при приёме, снятие — с уничтожением
		.use(TVirtualCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
