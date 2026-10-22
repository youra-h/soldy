/**
 * useSetupSelectItem — setup-слой опции Select (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`SelectItemDescriptor` — текст и значение опции) и фасада
 * (`SelectCollectionItemDescriptor` — выбор, порядок, сторона отметки).
 * Расширение элемента берёт через лифт движок и регистратор Select и отдаёт
 * фасаду контекст опции.
 *
 * В коллекцию опция входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Опции стоят в панели — портале Frame, — а портал
 * React контекст сохраняет: лифт Select опция читает и там. На сервере
 * портала нет, и опций разметкой — тоже: в коллекцию они входят после
 * гидратации. Пересобранный Select — это новый движок: опция пересобирается
 * вслед за ним, потому что сменилось прочитанное через лифт.
 *
 * `context` отдаётся разметке явно: выбор — метод item-адаптера.
 */

import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { SelectItemProps } from './base.component'

export function useSetupSelectItem(props: SelectItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(SelectItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			SelectCollectionItemDescriptor(),
			{ props },
			{ bundle: adapter.bundle },
		).use(TCollectionItemExtension, { item: adapter.instance, elevator })

		return [adapter, item] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...facade.state, ...owner.state },
		context: item.instance.context,
	}
}
