import { DestroyRef, Directive, inject, type Type } from '@angular/core'
import {
	TAccordionItemComponent,
	TListBoxItemComponent,
	TMenuCheckboxItemComponent,
	TMenuItemComponent,
	TMenuPopoverItemComponent,
	TMenuRadioItemComponent,
	TMenuSubmenuComponent,
	TRadioGroupItemComponent,
	TTabsContentComponent,
	TTabsItemComponent,
} from '@soldy-ui/angular'
import { PART_LISTENERS, listen } from './events'

/**
 * Parts a preview places in markup, by component — their names in the
 * registry (`TComponentEntry.parts`): one owner's parts per preview, so the
 * name alone tells them apart.
 */
const PARTS: ReadonlyMap<Type<object>, string> = new Map<Type<object>, string>([
	[TTabsItemComponent, 'Item'],
	[TTabsContentComponent, 'Content'],
	[TListBoxItemComponent, 'Item'],
	[TAccordionItemComponent, 'Item'],
	[TRadioGroupItemComponent, 'Item'],
	[TMenuItemComponent, 'Item'],
	[TMenuCheckboxItemComponent, 'CheckboxItem'],
	[TMenuRadioItemComponent, 'RadioItem'],
	[TMenuSubmenuComponent, 'Submenu'],
	[TMenuPopoverItemComponent, 'PopoverItem'],
])

/**
 * A part the host listens to: `<div so-tabs-item pg-part>`.
 *
 * The listeners come from the preview's injector (`PART_LISTENERS`): the host
 * gives them when the shell asked for the events, and without them the part
 * is not listened to. They are subscribed in the constructor — after the
 * part's component is created and before its assembly (`ngOnInit`), as the
 * output bindings of a template are: the events the part sends while entering
 * its collection already have someone to receive them. The parts of a
 * template stand in its checks — in `@for`, in a menu's panel — and every one
 * is listened to from its creation, which a query after the check would miss.
 */
@Directive({ selector: '[pg-part]' })
export class PartDirective {
	constructor() {
		const listeners = inject(PART_LISTENERS, { optional: true })

		if (!listeners) return

		for (const [type, part] of PARTS) {
			const component = inject(type, { self: true, optional: true })

			if (!component) continue

			const own = listeners[part]

			if (own) inject(DestroyRef).onDestroy(listen(component, own))

			return
		}

		throw new Error('[playground] pg-part стоит не на части')
	}
}
