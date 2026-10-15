import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupAccordionItem — setup-слой секции Accordion.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`AccordionItemDescriptor` — текст, значение, сторона стрелки) и фасада
 * (`AccordionCollectionItemDescriptor` — раскрыта ли секция, порядок, вид).
 * Расширение элемента берёт лифтом из слоя аккордеона движок и регистратор и
 * отдаёт фасаду контекст секции.
 *
 * В коллекцию секция входит, когда контекст фасада принят, — в `ngOnInit`, и
 * на сервере тоже.
 */
export function setupAccordionItem(
	ctrl: IAccordionItem | undefined,
	props: object,
): TBinding<IAccordionItem, TAccordionItemCollectionFacade> {
	const adapter = createAngularAdapterContext(AccordionItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
