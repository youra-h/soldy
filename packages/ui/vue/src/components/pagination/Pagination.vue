<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { PaginationItem } from './item'
import SetupPagination from './setup.component'

export default { ...SetupPagination, components: { Button, Icon, PaginationItem } }
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
			Pagination — a single row: the "back" arrow, the list of pages, the
			"forward" arrow. The root is drawn by `tag` (`nav` by default): a
			landmark for the screen reader. The app names it — `aria_label` or
			`aria_labelledBy`, in the `aria` set: only it knows what is paged. The
			root has the `--size-*` and `--variant-*` modifiers and `data-disabled`.

			The arrows stand outside the list: the list holds only pages and gaps.
			There are no "first" and "last" buttons — the first and the last pages
			play that part, they are always shown.
		-->

		<!--
			The "back" arrow — to the previous page (`ctrl.prev()`). `size` and
			`variant` are the pagination's: the theme takes the color from the
			button's modifier. The pagination computes the disabled state
			(`prevDisabled`: the first page, no current page or the component is
			disabled), the name from the locale is in the `prevAria` set. No view:
			the theme gives `plain` and the square by context. The icon is the
			`arrowRight` role on both arrows: the theme mirrors "back" by the line's
			direction. The `prev-icon` slot is an icon of one's own; it takes an arrow
			that points to the line's end — the theme mirrors it too.
		-->
		<Button
			embedded="pagination.prev"
			type="button"
			class="so-pagination__prev"
			:size="size"
			:variant="variant"
			:disabled="prevDisabled"
			@click="ctrl.prev()"
			v-bind="prevAria"
		>
			<slot name="prev-icon">
				<Icon embedded="pagination.prev-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>

		<ol class="so-pagination__list">
			<!--
				Pages and gaps in the window's order (`cells`): the first page, a gap,
				N pages around the current one, a gap, the last (`1 … 4 5 6 … 10`). A
				page is a collection item; the collection holds only the window's pages.
				A gap is the owner's markup where two or more pages are skipped between
				neighboring window pages: the window shows a single skipped page as a
				page (`1 2 3 4 5 … 10`).

				The place's key is `cell.key`: a page's `uid`. A page that stays on
				screen as the window moves is the same instance, and the focused node on
				it is not rebuilt.

				The page's slot is relayed whole: `item`, the scope — the page slot's
				scope (`text`) plus the page. It is relayed only when the pagination has
				it: the relay refers to the loop's `cell`, and Vue redraws an item with
				such slots on every redraw of its owner (AGENTS.md, Pitfalls).
			-->
			<template v-for="cell in cells" :key="cell.key">
				<PaginationItem v-if="cell.kind === 'item' && $slots.item" :ctrl="cell.item">
					<template #default="{ text }">
						<slot name="item" :item="cell.item" :text="text" />
					</template>
				</PaginationItem>
				<PaginationItem v-else-if="cell.kind === 'item'" :ctrl="cell.item" />

				<!--
					A gap is neither a button nor an icon: nothing is pressed on it, and
					it has no focus. The ellipsis is text. The theme gives the cell the
					width of a narrow page.
				-->
				<li v-else class="so-pagination__ellipsis">…</li>
			</template>
		</ol>

		<!--
			The "forward" arrow — to the next page (`ctrl.next()`); disabled on the
			last one (`nextDisabled`). The rest is as at "back": the name from the
			locale is in the `nextAria` set, the slot is `next-icon`.
		-->
		<Button
			embedded="pagination.next"
			type="button"
			class="so-pagination__next"
			:size="size"
			:variant="variant"
			:disabled="nextDisabled"
			@click="ctrl.next()"
			v-bind="nextAria"
		>
			<slot name="next-icon">
				<Icon embedded="pagination.next-icon" :tag="arrowIconTag" :size="size" />
			</slot>
		</Button>
	</component>
</template>
