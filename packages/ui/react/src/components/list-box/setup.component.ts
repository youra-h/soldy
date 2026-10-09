/**
 * useSetupListBox — setup-слой ListBox (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`ListBoxDescriptor`) и фасада коллекции
 * (`ListBoxCollectionDescriptor`) на общем наборе. Фасад собран на инстансе
 * владельца, поэтому пересобираются и уничтожаются они вместе.
 *
 * Расширения коллекции опускают движок и регистратор элементов лифтом
 * компонента; детям его слой (`layer`) отдаёт `Elevate` в разметке. Окно
 * обёртки `Virtual` над списком фасад подхватывает тем же лифтом
 * (`TVirtualCollectionExtension`), а своему поддереву опускает пустое
 * подключение: списки в слотах элементов окна не наследуют.
 */

import {
	ListBoxCollectionDescriptor,
	ListBoxDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { ListBoxProps } from './base.component'

export function useSetupListBox(props: ListBoxProps) {
	const {
		contexts: [adapter, collection],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(ListBoxDescriptor(), { ctrl: props.ctrl, props })

		const collection = create(
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
			// обёртку — при коммите, снятие — с уничтожением
			.use(TVirtualCollectionExtension, { elevator })

		return [adapter, collection] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(collection, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...owner.state, ...facade.state },
		layer,
	}
}
