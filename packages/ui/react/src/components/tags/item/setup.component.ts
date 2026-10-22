/**
 * useSetupTagsItem — setup-слой тега (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`TagsItemDescriptor` — текст, значение, закрываемость, вариант) и фасада
 * (`TagsCollectionItemDescriptor` — выбор, порядок, итог закрываемости).
 * Расширение элемента берёт через лифт движок и регистратор набора и отдаёт
 * фасаду контекст тега.
 *
 * В коллекцию тег входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранный набор — это новый движок: тег
 * пересобирается вслед за ним, потому что сменилось прочитанное через лифт.
 *
 * `context` отдаётся разметке явно: выбор и закрытие — методы item-адаптеров.
 */

import {
	TCollectionItemExtension,
	TagsCollectionItemDescriptor,
	TagsItemDescriptor,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { TagsItemProps } from './base.component'

export function useSetupTagsItem(props: TagsItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(TagsItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			TagsCollectionItemDescriptor(),
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
