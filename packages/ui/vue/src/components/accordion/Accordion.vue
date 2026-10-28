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

				A relay that touches a `v-for`'s loop variable, or has a `v-if` on one
				of its forwarded `<template #slot>`, makes Vue redraw the whole section
				with every redraw of the owner (AGENTS.md, Pitfalls) — so the common
				slots (`item`, `item-leading`, `item-trailing`, `item-content`) relay
				through the section's own scope, as a single static set, unconditionally.

				The icon slots are rarer and still cost a redraw when given: a `v-if`
				picks their default-arrow fallback, which only the section itself can
				decide, and only by the slot's presence — so when either is given, this
				falls back to the plain, pre-optimization relay below. Consumers that
				override an arrow and also need many sections should use `items` with
				the `item-leading`/`item-trailing` wrappers instead.
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
			<template v-else>
				<template v-for="entry in shown" :key="entry.uid">
					<AccordionItem :ctrl="entry">
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
			</template>
		</slot>
	</div>
</template>
