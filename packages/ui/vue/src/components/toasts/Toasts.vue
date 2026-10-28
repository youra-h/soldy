<script lang="ts">
import { ToastsItem } from './item'
import SetupToasts from './setup.component'

/**
 * `inheritAttrs: false` is a must: the template's root is a fragment of the
 * app in the slot and the teleport. A fragment has no automatic attribute
 * transfer at all, and a transfer into the slot or the teleport would land in
 * the wrong place. So the attributes go by hand to the region: it is the
 * manager's root.
 */
export default { ...SetupToasts, inheritAttrs: false, components: { ToastsItem } }
</script>

<template>
	<!--
		The manager wraps the app, as `LocaleProvider` does: the `default` slot is
		the app itself, with no markup of its own around it. A descendant takes
		the toasts API (`useToasts()`) from the manager's elevator. The region
		with the toasts is the root's second node, teleported to the layer's
		target (`target`). The slot stands outside the region's condition: the
		app is drawn without the region too.
	-->
	<slot />

	<teleport :to="target">
		<!--
			The region always stands, empty too: a live region has to be in the
			document before the first toast. It takes no place and catches no
			presses past the toasts — that is the theme's (`toasts/_toasts.scss`).

			On it: the place — the `so-toasts--placement-*` modifier, and the layout
			— `so-toasts--layout-*` (both always there), the layer's number —
			`z-index` (`layout_styles`) and `data-layer`, `role="region"`,
			`aria-live` and the name from the locale ("Notifications (F8)"), `dir`.
			The consumer's attributes go over the sets. The stack plugin listens to
			the wheel and the arrows on it.
		-->
		<component
			ref="rootElement"
			:is="tag"
			v-if="rendered"
			v-show="visible"
			:class="classes"
			:style="layout_styles"
			v-bind="{ ...attrs, ...aria, ...dataset, ...$attrs }"
		>
			<ol class="so-toasts__list">
				<!--
					A toast per shown one (`shown`), the new one first: on screen it is
					at the window's edge, and the list grows from the edge. A closed
					toast stays here while it fades and leaves the collection when its
					root's transitions have played out.

					The toast's slots are relayed whole: `item-<slot>`, the scope — the
					toast slot's scope plus the toast. The icon and the close icon go to
					the toast only when the manager has them, as the icon slots of the
					other collections' items: without a slot the toast draws its own —
					the type's icon and the close icon. An empty relay of the text and
					the content the toast replaces with its own — the type's icon, the
					text and `render`.

					The slots are relayed only when the manager has any of them: the
					relay refers to the loop's `item`, and Vue redraws an item with such
					slots on every redraw of its owner (AGENTS.md, Pitfalls).
				-->
				<template v-for="item in shown" :key="item.uid">
					<ToastsItem
						v-if="
							!(
								$slots.item ||
								$slots['item-icon'] ||
								$slots['item-content'] ||
								$slots['item-close-icon']
							)
						"
						:ctrl="item"
					/>
					<ToastsItem v-else :ctrl="item">
						<template v-if="$slots['item-icon']" #icon="{ type }">
							<slot name="item-icon" :item="item" :type="type" />
						</template>
						<template #default="{ text }">
							<slot name="item" :item="item" :text="text" />
						</template>
						<template #content>
							<slot name="item-content" :item="item" />
						</template>
						<template v-if="$slots['item-close-icon']" #close-icon>
							<slot name="item-close-icon" :item="item" />
						</template>
					</ToastsItem>
				</template>
			</ol>
		</component>
	</teleport>
</template>
