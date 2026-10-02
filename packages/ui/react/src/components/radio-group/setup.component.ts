/**
 * useSetupRadioGroup — setup-слой RadioGroup (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`RadioGroupDescriptor`) и фасада
 * коллекции (`RadioGroupCollectionDescriptor`) на общем наборе. Фасад собран
 * на инстансе группы, поэтому пересобираются и уничтожаются они вместе.
 *
 * Расширение коллекции опускает движок и регистратор радио лифтом компонента;
 * детям его слой (`layer`) отдаёт `Elevate` в разметке. Drag-and-drop нет, как
 * у Vue: радио одной группы стоят где угодно в разметке, и порядка на экране
 * у них нет.
 */

import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { RadioGroupProps } from './base.component'

export function useSetupRadioGroup(props: RadioGroupProps) {
	const {
		contexts: [adapter, collection],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(RadioGroupDescriptor(), { ctrl: props.ctrl, props })

		const collection = create(
			RadioGroupCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

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
