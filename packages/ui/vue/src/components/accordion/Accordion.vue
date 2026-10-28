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

				The slots are relayed only when the accordion has any of them: the
				relay refers to the loop variable, and Vue redraws a section with such
				slots on every redraw of its owner (AGENTS.md, Pitfalls). The relay
				forwards the section's own scope as given and never touches the
				owner's loop variable: the compiler compares names, not scopes, and
				finds a bound identifier wherever it occurs in the forwarded content,
				member access on it included. `item-content` alone is the slot almost
				every consumer gives, so this is what keeps it from redrawing every
				section on every redraw of the owner.

				A `v-if` on a forwarded `<template #slot>` makes the whole slot set
				dynamic too, whatever it forwards: so which icon slots are given is
				decided once, above the loop — each combination forwards its own
				static slot set, the icon slots among them unconditional within it,
				never a `v-if` on the forwarding `<template>` itself.
			-->
			<template v-if="!($slots['item-leading-icon'] || $slots['item-trailing-icon'])">
				<template v-for="entry in shown" :key="entry.uid">
					<AccordionItem
						v-if="
							!(
								$slots.item ||
								$slots['item-leading'] ||
								$slots['item-trailing'] ||
								$slots['item-content']
							)
						"
						:ctrl="entry"
					/>
					<AccordionItem v-else :ctrl="entry">
						<template #leading="{ item }">
							<slot name="item-leading" :item="item" />
						</template>
						<template #header="{ item, text, selected }">
							<slot name="item" :item="item" :text="text" :selected="selected" />
						</template>
						<template #trailing="{ item }">
							<slot name="item-trailing" :item="item" />
						</template>
						<template #default="{ item }">
							<slot name="item-content" :item="item" />
						</template>
					</AccordionItem>
				</template>
			</template>
			<template v-else-if="$slots['item-leading-icon'] && !$slots['item-trailing-icon']">
				<template v-for="entry in shown" :key="entry.uid">
					<AccordionItem :ctrl="entry">
						<template #leading-icon="{ item }">
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
						<template #default="{ item }">
							<slot name="item-content" :item="item" />
						</template>
					</AccordionItem>
				</template>
			</template>
			<template v-else-if="!$slots['item-leading-icon'] && $slots['item-trailing-icon']">
				<template v-for="entry in shown" :key="entry.uid">
					<AccordionItem :ctrl="entry">
						<template #leading="{ item }">
							<slot name="item-leading" :item="item" />
						</template>
						<template #header="{ item, text, selected }">
							<slot name="item" :item="item" :text="text" :selected="selected" />
						</template>
						<template #trailing="{ item }">
							<slot name="item-trailing" :item="item" />
						</template>
						<template #trailing-icon="{ item }">
							<slot name="item-trailing-icon" :item="item" />
						</template>
						<template #default="{ item }">
							<slot name="item-content" :item="item" />
						</template>
					</AccordionItem>
				</template>
			</template>
			<template v-else>
				<template v-for="entry in shown" :key="entry.uid">
					<AccordionItem :ctrl="entry">
						<template #leading-icon="{ item }">
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
						<template #trailing-icon="{ item }">
							<slot name="item-trailing-icon" :item="item" />
						</template>
						<template #default="{ item }">
							<slot name="item-content" :item="item" />
						</template>
					</AccordionItem>
				</template>
			</template>
		</slot>
	</div>
</template>
