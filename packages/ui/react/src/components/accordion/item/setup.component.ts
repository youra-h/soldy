/**
 * useSetupAccordionItem — setup-слой секции Accordion (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой, как у элементов Vue: собственный
 * (`AccordionItemDescriptor` — текст, значение, сторона стрелки) и фасада
 * (`AccordionCollectionItemDescriptor` — раскрытость, порядок, вид, сторона
 * панели в ARIA-связке). Расширение элемента берёт через лифт движок и
 * регистратор аккордеона и отдаёт фасаду контекст секции.
 *
 * В коллекцию секция входит, когда `useAdapterContext` принимает контексты при
 * коммите, а не на рендере. Пересобранный аккордеон — это новый движок: секция
 * пересобирается вслед за ним, потому что сменилось прочитанное через лифт.
 *
 * `context` отдаётся разметке явно: раскрытие — метод item-адаптера.
 */

import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../../adapter'
import type { AccordionItemProps } from './base.component'

export function useSetupAccordionItem(props: AccordionItemProps) {
	const {
		contexts: [adapter, item],
	} = useAdapterContext((create, elevator) => {
		const adapter = create(AccordionItemDescriptor(), { ctrl: props.ctrl, props })

		const item = create(
			AccordionCollectionItemDescriptor(),
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
