<script lang="ts">
import { Frame } from '../frame'
import { MenuGroup } from './group'
import { MenuItem } from './item'
import { MenuSeparator } from './separator'
import { MenuSubmenu } from './submenu'
import SetupMenu from './setup.component'

export default {
	...SetupMenu,
	components: { Frame, MenuGroup, MenuItem, MenuSeparator, MenuSubmenu },
}
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...attrs, ...dataset }"
	>
		<!--
			The root is the trigger's wrapper and the panel's anchor, as Popover's.
			It is drawn by `tag`, `span` by default: the menu fits into a line of
			text and into a row of buttons. The panel is teleported, so the root
			holds only the trigger, and the root's box is the trigger's box.

			`data-open` is on the root for a consumer who paints their trigger by
			context. The menu's theme does not read it: an open trigger is
			"pressed" anyway, by `data-selected` from `triggerDataset`. No ARIA on
			the root: it is on the panel and the trigger.
		-->

		<!--
			The trigger is the consumer's button ("…", "Actions"). It lies inside
			the root: a press on the open trigger is a press inside the owner, and
			the panel does not blink. The slot's content has no instance of its own,
			so it gets its side of the link (`aria-haspopup`, `aria-expanded`, `id`,
			`aria-controls`) and the "pressed" look (`data-selected`) through the
			scope — two sets, ARIA and `data-*` apart. The consumer draws the
			button's arrow. For a context menu (`openOn: 'contextmenu'`) this is an
			area — a row, a file, a picture — and its link is empty.
		-->
		<slot name="trigger" :triggerAria="triggerAria" :triggerDataset="triggerDataset" />

		<!--
			The panel is a Frame: the teleport, the layer, the anchoring to the root
			(`TAnchorPlugin`, a 4px offset, as Select's) and the owner mark for
			closing on a press outside. The menu's `aria` goes on it: `role="menu"`,
			the `id` the trigger's `aria-controls` refers to, and `aria-labelledby`
			to the trigger — the menu's name. `tabindex="-1"` — the focus stands on
			the panel itself while no item is highlighted.

			A context menu's panel stands at the call point (`point`): the point
			wins over the root while it is set, and the anchor picks between them,
			not the template. The root stays the anchor for when there is no point.

			Openness is the panel's `visible`, not `rendered`: the items join the
			collection on mounting, and closing must not empty it. The theme reads
			appearing and disappearing from `data-open`, which Frame writes itself.

			The panel's classes are the menu's own set (`panelClasses`): the
			`so-menu__panel` block with the menu's size and variant. The root's
			modifiers do not reach the teleported panel, and the theme takes the
			size of the groups' labels and the color of items without a variant of
			their own from it.
		-->
		<Frame
			embedded="menu.frame"
			:class="panelClasses"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			:anchor_point="point"
			:anchor_placement="placement"
			:anchor_offset="4"
			v-bind="{ ...aria, ...dismiss_ownerAttribute }"
		>
			<!--
				The list is what scrolls: the padding is inside the scroll, and the
				highlighted row is not pressed to the edge. The `menu` role is on the
				panel, not here: the panel holds the focus without a highlight, and the
				node with the role and the focus has to be one.
			-->
			<!--
				Items are mounted from the panel's first opening on
				(`contentRendered`): a menu nobody opened builds only its trigger
				and an empty panel. Closing hides the panel and keeps them.
			-->
			<div class="so-menu__list">
				<slot v-if="contentRendered">
					<!--
						Items from `items` — actions and submenus: checkboxes are put in
						markup. The loop goes by the sections of the shown items
						(`sections`), keyed by the section's key: a group with a label — in
						`MenuGroup`, items without a group — right in the list, and between
						neighboring sections, while the menu asks for it
						(`groupSeparators`), a separator. The sections follow the shown
						order, so the arrows move as the items stand on screen. Without
						groups there is one section — no wrapper, no separator.

						An item is keyed by `uid`. An item with nested `items` is a submenu
						from data: the collection hands over its record (`submenus`), which
						goes into `MenuSubmenu`'s props — the item (`ctrl`) and the engine of
						its items (`engine`) — the same input as a submenu in markup with an
						outside engine. The rest are actions.

						The item's slots are relayed whole: each row slot has its
						`item-<slot>`, the scope — the row slot's scope plus the item
						(`item`). An action's `default` is `item`, a submenu's —
						`item-content`: empty, the submenu draws its items from data. The
						menu hands its `item` and `item-*` to a submenu under the same names
						— the slots are one for all levels. The relay is written for the
						items of a group and for those without one: their wrappers differ.

						The slots are relayed only when the menu has any of them: the relay
						refers to the loop's `item`, and Vue redraws an item with such slots
						on every redraw of its owner (AGENTS.md, Pitfalls).
					-->
					<template v-for="(section, index) in sections" :key="section.key">
						<MenuSeparator v-if="groupSeparators && index > 0" />
						<MenuGroup v-if="section.group" :label="section.group.label">
							<template v-for="item in section.items" :key="item.uid">
								<template
									v-if="
										!(
											$slots.item ||
											$slots['item-leading'] ||
											$slots['item-trailing'] ||
											$slots['item-header'] ||
											$slots['item-arrow-icon'] ||
											$slots['item-content']
										)
									"
								>
									<MenuSubmenu
										v-if="submenus.has(item)"
										v-bind="submenus.get(item)"
									/>
									<MenuItem v-else :ctrl="item" />
								</template>
								<MenuSubmenu
									v-else-if="submenus.has(item)"
									v-bind="submenus.get(item)"
								>
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #header="{ text, open }">
										<slot
											name="item-header"
											:item="item"
											:text="text"
											:open="open"
										/>
									</template>
									<template #arrow-icon>
										<slot name="item-arrow-icon" :item="item" />
									</template>
									<template #default>
										<slot name="item-content" :item="item" />
									</template>
									<template #item="{ item: child, text }">
										<slot name="item" :item="child" :text="text" />
									</template>
									<template #item-leading="{ item: child }">
										<slot name="item-leading" :item="child" />
									</template>
									<template #item-trailing="{ item: child }">
										<slot name="item-trailing" :item="child" />
									</template>
									<template #item-header="{ item: child, text, open }">
										<slot
											name="item-header"
											:item="child"
											:text="text"
											:open="open"
										/>
									</template>
									<template #item-arrow-icon="{ item: child }">
										<slot name="item-arrow-icon" :item="child" />
									</template>
									<template #item-content="{ item: child }">
										<slot name="item-content" :item="child" />
									</template>
								</MenuSubmenu>
								<MenuItem v-else :ctrl="item">
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #default="{ text }">
										<slot name="item" :item="item" :text="text" />
									</template>
									<template #trailing>
										<slot name="item-trailing" :item="item" />
									</template>
								</MenuItem>
							</template>
						</MenuGroup>
						<template v-else>
							<template v-for="item in section.items" :key="item.uid">
								<template
									v-if="
										!(
											$slots.item ||
											$slots['item-leading'] ||
											$slots['item-trailing'] ||
											$slots['item-header'] ||
											$slots['item-arrow-icon'] ||
											$slots['item-content']
										)
									"
								>
									<MenuSubmenu
										v-if="submenus.has(item)"
										v-bind="submenus.get(item)"
									/>
									<MenuItem v-else :ctrl="item" />
								</template>
								<MenuSubmenu
									v-else-if="submenus.has(item)"
									v-bind="submenus.get(item)"
								>
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #header="{ text, open }">
										<slot
											name="item-header"
											:item="item"
											:text="text"
											:open="open"
										/>
									</template>
									<template #arrow-icon>
										<slot name="item-arrow-icon" :item="item" />
									</template>
									<template #default>
										<slot name="item-content" :item="item" />
									</template>
									<template #item="{ item: child, text }">
										<slot name="item" :item="child" :text="text" />
									</template>
									<template #item-leading="{ item: child }">
										<slot name="item-leading" :item="child" />
									</template>
									<template #item-trailing="{ item: child }">
										<slot name="item-trailing" :item="child" />
									</template>
									<template #item-header="{ item: child, text, open }">
										<slot
											name="item-header"
											:item="child"
											:text="text"
											:open="open"
										/>
									</template>
									<template #item-arrow-icon="{ item: child }">
										<slot name="item-arrow-icon" :item="child" />
									</template>
									<template #item-content="{ item: child }">
										<slot name="item-content" :item="child" />
									</template>
								</MenuSubmenu>
								<MenuItem v-else :ctrl="item">
									<template #leading>
										<slot name="item-leading" :item="item" />
									</template>
									<template #default="{ text }">
										<slot name="item" :item="item" :text="text" />
									</template>
									<template #trailing>
										<slot name="item-trailing" :item="item" />
									</template>
								</MenuItem>
							</template>
						</template>
					</template>
				</slot>
			</div>
		</Frame>
	</component>
</template>
