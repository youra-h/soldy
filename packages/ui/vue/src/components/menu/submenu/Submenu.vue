<script lang="ts">
import { ItemRow } from '../../item-row'
import { Frame } from '../../frame'
import { Icon } from '../../icon'
import { MenuGroup } from '../group'
import { MenuItem } from '../item'
import { MenuSeparator } from '../separator'
import Submenu from './Submenu.vue'
import SetupMenuSubmenu from './setup.component'

/**
 * Submenus from data inside a submenu — the third level and below — are drawn
 * by the submenu itself: `<Submenu>` in the markup is this component, through
 * the import of its own module.
 *
 * - Registered, not just a file name: Vue finds a component by its file name
 *   after the application's global components, and someone else's `Submenu`
 *   would replace the level.
 * - A getter: rendering reads the reference to itself, and while the module
 *   runs, its export does not exist yet.
 * - The property is defined over the object, not written in it: vue-tsc takes
 *   the markup's types from `components`, and the reference to itself would
 *   close the component's type on itself. vue-tsc infers the type of
 *   `<Submenu>` by the file name — which is this very component.
 * - In the initializer, not a statement of its own: the package declares its
 *   modules free of side effects (`sideEffects: false`), and at its top level a
 *   module only declares.
 */
const components = Object.defineProperty(
	{ Frame, Icon, ItemRow, MenuGroup, MenuItem, MenuSeparator },
	'Submenu',
	{ enumerable: true, get: () => Submenu },
)

/**
 * An item with a submenu: the item's row in the menu above and a panel of its
 * own with the items.
 *
 * No whitespace around the icon's slot: the theme hides an empty wrapper by
 * `:empty`, and whitespace text would make it non-empty.
 */
export default { ...SetupMenuSubmenu, components }
</script>

<template>
	<component
		ref="rootElement"
		:is="tag"
		v-if="rendered"
		v-show="visible"
		:class="classes"
		v-bind="{ ...dataset, ...containerAttrs, ...attrs }"
	>
		<!--
			The root carries the state for the theme (`data-highlighted`,
			`data-disabled`, `data-open`) and the modifiers of the menu's size and of
			its own variant, and the row is painted from it, as an item's: an open
			item glows while its panel is open. The root is the panel's anchor: its
			box is the row.
		-->

		<!--
			The row is an `ItemRow` on a `div`, as an item's: it has the item's ARIA
			(the `menuitem` role, `aria-haspopup="menu"`, `aria-expanded`, the `id`
			and `aria-controls` to the panel, `tabindex="-1"` from the menu) and the
			DOM focus while the item is highlighted.

			A press on the row opens the submenu, it does not toggle: a click does
			not close one opened by hovering. The menu decides
			(`adapters.menu.open()`) and refuses a disabled one. The item's keyboard
			handles the arrow to the line's end, Enter and Space itself and opens
			the submenu on its first item — they make no click.
		-->
		<ItemRow
			embedded="menu.row"
			tag="div"
			:size="size"
			:disabled="disabled"
			@click="context?.adapters.menu.open()"
			v-bind="{ ...aria, ...controlAttrs }"
		>
			<template #leading>
				<span class="so-menu-item__icon"><slot name="leading" /></span>
			</template>

			<slot name="header" :text="text" :open="open">{{ text }}</slot>

			<!--
				The arrow is at the line's end, in a wrapper that holds its place and
				mirrors it in RTL. The wrapper is hidden from the screen reader: the
				submenu announces `aria-haspopup`.
			-->
			<template #trailing>
				<span class="so-menu-item__arrow" aria-hidden="true">
					<slot name="arrow-icon">
						<Icon embedded="menu.arrow" :tag="arrowIconTag" :size="size" />
					</slot>
				</span>
			</template>
		</ItemRow>

		<!--
			The panel is a Frame, as the menu's: the teleport, a layer above the
			menu's panel above it (the menu does not count a press in it as
			outside), the anchoring to the item's root and the owner mark. It stands
			at the row's end, its top level with the row, without a gap; at the
			window's edge the anchoring moves it to the row's start, in RTL the other
			way. The panel's set goes on it (`panelAria`): `role="menu"`, the `id`
			the row's `aria-controls` refers to, and `aria-labelledby` to the row —
			the submenu's name. `tabindex="-1"` — the focus stands on the panel
			itself while no item is highlighted.

			Openness is the panel's `visible`, not `rendered`: the items join the
			submenu's collection on mounting, and closing must not empty it. The
			classes are its own set (`panelClasses`): the menu panel's block with the
			submenu's size and its panel's variant — the submenu's own, and without
			it the variant of the menu above.
		-->
		<Frame
			embedded="menu.submenu-frame"
			:class="panelClasses"
			tabindex="-1"
			:visible="open"
			position="fixed"
			:anchor_anchor="rootElement"
			anchor_placement="end-start"
			v-bind="{ ...panelAria, ...dismiss_ownerAttribute }"
		>
			<!--
				The list is what scrolls, as the menu's. Items from `items` — actions
				and submenus, by the sections of the shown ones: a group with a label —
				in `MenuGroup`, items without a group — right in the list, and between
				neighboring sections, while the submenu asks for it
				(`groupSeparators`), a separator. An item with nested `items` is a
				submenu of the next level, as in the menu: its record (`submenus`) goes
				into the props of `Submenu` — this very component. The item's slots are
				relayed whole: `item-<slot>`, the scope — the row slot's scope plus the
				item; the submenu's `default` is `item-content`, and the submenu hands
				its `item` and `item-*` to the next level under the same names.

				The slots are relayed only when the submenu has any of them: the relay
				refers to the loop's `item`, and Vue redraws an item with such slots on
				every redraw of its owner (AGENTS.md, Pitfalls).
			-->
			<!--
				Items are mounted from the panel's first opening on
				(`contentRendered`), as the menu's.
			-->
			<div class="so-menu__list">
				<slot v-if="contentRendered">
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
									<Submenu
										v-if="submenus.has(item)"
										v-bind="submenus.get(item)"
									/>
									<MenuItem v-else :ctrl="item" />
								</template>
								<Submenu v-else-if="submenus.has(item)" v-bind="submenus.get(item)">
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
								</Submenu>
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
									<Submenu
										v-if="submenus.has(item)"
										v-bind="submenus.get(item)"
									/>
									<MenuItem v-else :ctrl="item" />
								</template>
								<Submenu v-else-if="submenus.has(item)" v-bind="submenus.get(item)">
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
								</Submenu>
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
