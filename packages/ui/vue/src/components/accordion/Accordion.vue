<script lang="ts">
import { AccordionItem } from './item'
import SetupAccordion from './setup.component'

export default { ...SetupAccordion, components: { AccordionItem } }
</script>

<template>
	<div ref="rootElement" v-if="rendered" v-show="visible" :class="classes" v-bind="attrs">
		<slot>
			<!--
				The items' slots are static and get the item through the scope —
				dynamic names resolve only in Vue (see Tabs.vue). The relay is whole:
				each section slot has its `item-<slot>`, whose scope is the section
				slot's own scope — the section's `item` among it (`item.descriptor.ts`),
				the way a table row's `cell` slot carries its own `row`
				(`table/row/Cells.vue`). The section's header (`header`) is `item`.

				`item-content` is the content of the expanding panel. There is no
				`Accordion.Content` component: the panel lies inside the item and does
				not exist apart from it, so it stays a slot.

				The section draws the arrows itself and decides by the slot's presence
				whether the arrow's wrapper stands on that side — so their slots go to
				it only when the accordion has them.

				The slots are relayed only when the accordion has any of them. The
				`v-if` on the icon slots makes the relayed set dynamic, and Vue then
				redraws every section with every redraw of the owner (AGENTS.md,
				Pitfalls). That is accepted: opening a section does not redraw the
				owner, and `size`, `variant` and `disabled` reach the sections anyway —
				only a change of the owner's own attributes redraws them needlessly.
				A static set took a second copy of the loop (PR #768), and the gain
				did not pay for it.
			-->
			<template v-for="entry in shown" :key="entry.uid">
				<AccordionItem
					v-if="
						!(
							$slots.item ||
							$slots['item-leading'] ||
							$slots['item-trailing'] ||
							$slots['item-leading-icon'] ||
							$slots['item-trailing-icon'] ||
							$slots['item-content']
						)
					"
					:ctrl="entry"
				/>
				<AccordionItem v-else :ctrl="entry">
					<template v-if="$slots['item-leading-icon']" #leading-icon="{ item }">
						<slot name="item-leading-icon" :item="item" />
					</template>
					<template #leading="{ item }">
						<slot name="item-leading" :item="item" />
					</template>
					<template #header="{ item, text, selected }">
						<slot name="item" :item="item" :text="text" :selected="selected" />
					</template>
					<template #trailing="{ item }">
						<slot name="item-trailing" :item="item" />
					</template>
					<template v-if="$slots['item-trailing-icon']" #trailing-icon="{ item }">
						<slot name="item-trailing-icon" :item="item" />
					</template>
					<template #default="{ item }">
						<slot name="item-content" :item="item" />
					</template>
				</AccordionItem>
			</template>
		</slot>
	</div>
</template>
