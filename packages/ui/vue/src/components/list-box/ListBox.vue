<script lang="ts">
import { ListBoxItem } from './item'
import { ListBoxGroup } from './group'
import SetupListBox from './setup.component'

export default { ...SetupListBox, components: { ListBoxItem, ListBoxGroup } }
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
			The root is a frame: the header, the list and the footer. The `aria` set
			is the list itself (`role="listbox"`, `aria-multiselectable`, the name
			from `aria_label`), and it lies on the list's node, not on the root: ARIA
			lets only options and groups into a `listbox`, and the header and the
			footer are a place for fields and buttons. The Tab stop is on the list's
			node too: its keyboard's arrows move between the items
			(`TListKeyboardPlugin`). The root has `attrs` and `dataset`: the theme
			paints the frame by the root.

			The consumer's attributes split as a field's: class and style — to the
			root (`containerAttrs`), the rest — to the list's node (`controlAttrs`),
			over its `aria` and Tab stop. The consumer's `aria-label` and `id` name
			the list, not the frame without a role, and `tabindex="-1"` takes the
			list off the Tab stops.

			The height plugin sets the rows limit (`maxRows`) on the list's node: it
			is what scrolls, while the header and the footer stay in place.
		-->
		<slot name="header" />
		<div class="so-list-box__list" tabindex="0" v-bind="{ ...aria, ...controlAttrs }">
			<slot>
				<!--
					The items are what the collection draws, by the grouping's sections
					(`drawnSections`), keyed by the section's key. A group with a label —
					in `ListBoxGroup`, items without a group — right in the list, and
					between neighboring sections, while the list asks for it
					(`groupSeparators`), a separator: a mute `div` (`aria-hidden`), not
					`separator` — ARIA lets only options and groups into a `listbox`. The
					sections follow the shown order, so the arrows move as the items stand
					on screen. Without groups there is one section — no wrapper, no
					separator.

					A section has its entries in order, keyed by the entry's key. Without a
					window these are all its shown items. In the window of the `Virtual`
					wrapper (a list without groups) — the visible ones and fillers in place
					of the skipped: a `div` under `aria-hidden` whose height the theme
					takes from its style. One loop for items and fillers: loops by blocks
					would remount an item moving from block to block.

					The items' slots are static and get the item through the scope —
					dynamic names resolve only in Vue (see Tabs.vue). The relay is whole:
					each item slot has its `item-<slot>`, whose scope is the item slot's
					scope plus the item. It is written for the items of a group and for
					those without one: their wrappers differ. The item draws its mark
					itself while its slot is not given — so the mark's slot goes to it only
					when the list has it.

					The slots are relayed only when the list has any of them: the relay
					refers to the loop's `entry`, and Vue redraws an item with such slots
					on every redraw of its owner (AGENTS.md, Pitfalls).
				-->
				<template v-for="(section, index) in drawnSections" :key="section.key">
					<div
						v-if="groupSeparators && index > 0"
						class="so-list-box__separator"
						aria-hidden="true"
					></div>
					<ListBoxGroup v-if="section.group" :label="section.group.label">
						<template v-for="entry in section.entries" :key="entry.key">
							<div
								v-if="entry.kind === 'filler'"
								class="so-list-box__filler"
								aria-hidden="true"
								:style="entry.style"
							></div>
							<ListBoxItem
								v-else-if="
									!(
										$slots.item ||
										$slots['item-leading'] ||
										$slots['item-trailing'] ||
										$slots['item-indicator-icon']
									)
								"
								:ctrl="entry.item"
							/>
							<ListBoxItem v-else :ctrl="entry.item">
								<template #leading>
									<slot name="item-leading" :item="entry.item" />
								</template>
								<template #default="{ text, selected }">
									<slot
										name="item"
										:item="entry.item"
										:text="text"
										:selected="selected"
									/>
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="entry.item" />
								</template>
								<template
									v-if="$slots['item-indicator-icon']"
									#indicator-icon="{ selected }"
								>
									<slot
										name="item-indicator-icon"
										:item="entry.item"
										:selected="selected"
									/>
								</template>
							</ListBoxItem>
						</template>
					</ListBoxGroup>
					<template v-else>
						<template v-for="entry in section.entries" :key="entry.key">
							<div
								v-if="entry.kind === 'filler'"
								class="so-list-box__filler"
								aria-hidden="true"
								:style="entry.style"
							></div>
							<ListBoxItem
								v-else-if="
									!(
										$slots.item ||
										$slots['item-leading'] ||
										$slots['item-trailing'] ||
										$slots['item-indicator-icon']
									)
								"
								:ctrl="entry.item"
							/>
							<ListBoxItem v-else :ctrl="entry.item">
								<template #leading>
									<slot name="item-leading" :item="entry.item" />
								</template>
								<template #default="{ text, selected }">
									<slot
										name="item"
										:item="entry.item"
										:text="text"
										:selected="selected"
									/>
								</template>
								<template #trailing>
									<slot name="item-trailing" :item="entry.item" />
								</template>
								<template
									v-if="$slots['item-indicator-icon']"
									#indicator-icon="{ selected }"
								>
									<slot
										name="item-indicator-icon"
										:item="entry.item"
										:selected="selected"
									/>
								</template>
							</ListBoxItem>
						</template>
					</template>
				</template>
			</slot>
			<!--
				An empty list — as in Select: while no item is shown, the `empty` slot
				stands in their place, inside the list. An empty `listbox` is a dead end
				for the screen reader, and the message explains what is going on.
			-->
			<slot v-if="shown.length === 0" name="empty" />
		</div>
		<slot name="footer" />
	</div>
</template>
