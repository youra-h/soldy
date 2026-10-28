<script lang="ts">
import { TabsItem } from './item'
import SetupTabs from './setup.component'

export default { ...SetupTabs, components: { TabsItem } }
</script>

<template>
	<div
		ref="rootElement"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset, ...containerAttrs }"
	>
		<!--
			The owner's `aria` set is the tab list: the core writes `role="tablist"`
			and `aria-orientation`, TAriaPlugin the name from `aria_label`. The root
			does not get it: the panels lie there next to the list. The root has
			`attrs` and `dataset`: the theme dims a disabled set by the root, with
			the panels (`data-disabled`).

			The consumer's attributes split as a field's: class and style — to the
			root (`containerAttrs`), the rest — to the tab list (`controlAttrs`), over
			its `aria`: the consumer's `aria-label` and `id` name the list, not the
			root without a role.

			The list stands in a row (`so-tabs__bar`), and the `leading` and
			`trailing` slots next to it, at the row's edges: ARIA lets only `tab`
			into `[role=tablist]`, and a button in a slot would be a forbidden child.
			The row is plain markup: no set, no consumer attributes.
		-->
		<div class="so-tabs__bar">
			<div class="so-tabs__leading" v-if="$slots.leading">
				<slot name="leading"></slot>
			</div>
			<div class="so-tabs__list" v-bind="{ ...aria, ...controlAttrs }">
				<slot>
					<!--
						The items' slots are static and get the item itself through the
						scope: dynamic names (`item:${value}:leading`) resolve only in Vue
						and are out of reach in the other five adapters. A particular item
						is addressed by a condition inside the slot on `item.value`.

						The relay is whole: each tab slot has its `item-<slot>`, whose scope
						is the tab slot's scope plus the tab. The tab draws its close icon
						itself while the slot is not given — so the icon's slot goes to it
						only when the set has it.

						The slots are relayed only when the set has any of them: the relay
						refers to the loop's `item`, and Vue redraws an item with such slots
						on every redraw of its owner (AGENTS.md, Pitfalls).
					-->
					<template v-for="item in shown" :key="item.uid">
						<TabsItem
							v-if="
								!(
									$slots.item ||
									$slots['item-leading'] ||
									$slots['item-trailing'] ||
									$slots['item-close-icon']
								)
							"
							:ctrl="item"
						/>
						<TabsItem v-else :ctrl="item">
							<template #leading>
								<slot name="item-leading" :item="item" />
							</template>
							<template #default="{ text, active }">
								<slot name="item" :item="item" :text="text" :active="active" />
							</template>
							<template #trailing>
								<slot name="item-trailing" :item="item" />
							</template>
							<template v-if="$slots['item-close-icon']" #close-icon>
								<slot name="item-close-icon" :item="item" />
							</template>
						</TabsItem>
					</template>
				</slot>
			</div>
			<div class="so-tabs__trailing" v-if="$slots.trailing">
				<slot name="trailing"></slot>
			</div>
		</div>
		<slot name="content" />
	</div>
</template>
