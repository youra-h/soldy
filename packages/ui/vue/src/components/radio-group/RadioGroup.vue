<script lang="ts">
import { RadioGroupItem } from './item'
import SetupRadioGroup from './setup.component'

export default { ...SetupRadioGroup, components: { RadioGroupItem } }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...aria, ...dataset }"
	>
		<!--
			The group's container. The owner's `aria` set is here: the core writes
			`role="radiogroup"`, TAriaPlugin the name from `aria_label` /
			`aria_labelledBy`.

			The oren theme has no styles for `.so-radio-group` (the owner's
			decision): the radios of one group stand anywhere inside the container —
			in a list's rows, in a table's cells — and the consumer sets the layout.
		-->
		<slot>
			<!--
				The fallback content — radios from the `items` prop, one per item (over
				`shown`, as in ListBox.vue). The label slot is static and gets the radio
				through the scope (`item`), as in the other collections: dynamic names
				resolve only in Vue. Next to the radio — the scope of the radio's own
				label (`active`).

				The slot is relayed only when the group has it: the relay refers to the
				loop's `item`, and Vue redraws an item with such slots on every redraw
				of its owner (AGENTS.md, Pitfalls).
			-->
			<template v-for="item in shown" :key="item.uid">
				<RadioGroupItem v-if="!$slots.item" :ctrl="item" />
				<RadioGroupItem v-else :ctrl="item">
					<template #default="{ active }">
						<slot name="item" :item="item" :active="active" />
					</template>
				</RadioGroupItem>
			</template>
		</slot>
	</component>
</template>
