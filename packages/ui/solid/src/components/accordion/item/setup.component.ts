/**
 * setupAccordionItem — setup-слой секции Accordion.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`AccordionItemDescriptor` — текст, значение, сторона стрелки) и фасада
 * (`AccordionCollectionItemDescriptor` — раскрытость, порядок, вид, сторона
 * панели в ARIA-связке). Расширение элемента берёт лифтом движок и
 * регистратор аккордеона — из слоя, который секция увидела при сборке
 * (`useElevator`), — и отдаёт фасаду контекст секции.
 *
 * В коллекцию секция входит, когда контекст фасада принят, — при выполнении
 * тела компонента, и на сервере тоже.
 *
 * `context` отдаётся разметке явно: раскрытие — метод item-адаптера.
 */

import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../../adapter'
import type { AccordionItemProps } from './base.component'

export function setupAccordionItem(props: AccordionItemProps) {
	const { elevator } = useElevator()
	const adapter = createSolidAdapterContext(AccordionItemDescriptor(), {
		ctrl: props.ctrl,
		props,
	})
	const owner = useAdapter(adapter, props)

	const item = createSolidAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator })

	const facade = useCollectionAdapter(item, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(facade.state, owner.state),
		context: item.instance.context,
		forwardProps: facade.forwardProps,
	}
}
