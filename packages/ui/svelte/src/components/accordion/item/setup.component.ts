/**
 * setupAccordionItem — setup-слой секции Accordion.
 *
 * Два контекста, как у элементов Vue: собственный (`AccordionItemDescriptor` —
 * текст, значение, сторона стрелки) и фасада
 * (`AccordionCollectionItemDescriptor` — раскрытость, порядок, вид).
 * Расширение элемента берёт лифтом движок и регистратор аккордеона и отдаёт
 * фасаду контекст секции.
 *
 * В коллекцию секция входит, когда контекст фасада принят, — при
 * инициализации компонента, и на сервере тоже.
 *
 * `context` отдаётся разметке явно: раскрытие — метод item-адаптера.
 */

import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../../adapter'
import type { AccordionItemProps } from './base.component'

export function setupAccordionItem(
	getProps: () => AccordionItemProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(AccordionItemDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps, receive)

	const item = createSvelteAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props, mountId },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, getProps, () => owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,

		get forwardProps() {
			return facade.forwardProps
		},
	}
}
