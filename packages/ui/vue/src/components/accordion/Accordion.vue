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
				slot's scope plus the section. The section's header (`header`) is
				`item`.

				`item-content` is the content of the expanding panel. There is no
				`Accordion.Content` component: the panel lies inside the item and does
				not exist apart from it, so it stays a slot.

				The section draws the arrows itself and decides by the slot's presence
				whether the arrow's wrapper stands on that side — so their slots go to
				it only when the accordion has them.

				The slots are relayed only when the accordion has any of them: the
				relay refers to the loop's `item`, and Vue redraws an item with such
				slots on every redraw of its owner (AGENTS.md, Pitfalls).
			-->
			<template v-for="item in shown" :key="item.uid">
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
					:ctrl="item"
				/>
				<AccordionItem v-else :ctrl="item">
					<template v-if="$slots['item-leading-icon']" #leading-icon>
						<slot name="item-leading-icon" :item="item" />
					</template>
					<template #leading>
						<slot name="item-leading" :item="item" />
					</template>
					<template #header="{ text, selected }">
						<slot name="item" :item="item" :text="text" :selected="selected" />
					</template>
					<template #trailing>
						<slot name="item-trailing" :item="item" />
					</template>
					<template v-if="$slots['item-trailing-icon']" #trailing-icon>
						<slot name="item-trailing-icon" :item="item" />
					</template>
					<slot name="item-content" :item="item" />
				</AccordionItem>
			</template>
		</slot>
	</div>
</template>
