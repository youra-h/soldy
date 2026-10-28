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
 * Parts a preview places in markup, by component, mapped to their registry
 * names (`TComponentEntry.parts`): a preview holds one owner's parts, so the
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
 * provides them when the shell asked for events, and without them the part is
 * not listened to. They are subscribed in the constructor, after the part's
 * component is created and before its assembly (`ngOnInit`), as a template's
 * output bindings are: the events the part sends while entering its
 * collection already have a receiver. A template's parts appear during its
 * checks (inside `@for`, in a menu's panel), and each is listened to from its
 * creation; a query after the check would miss those first events.
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
