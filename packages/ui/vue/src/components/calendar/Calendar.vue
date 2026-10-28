<script lang="ts">
import { Button } from '../button'
import { Icon } from '../icon'
import { ListBox } from '../list-box'
import { Popover } from '../popover'
import { CalendarItem } from './item'
import SetupCalendar from './setup.component'

export default { ...SetupCalendar, components: { Button, Icon, ListBox, Popover, CalendarItem } }
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
			Calendar — the grids of the shown months, one pair of paging buttons
			for all of them and the footer, if given. The root is drawn by `tag`
			and has no role: each table carries the grid of the APG (Date Picker
			Dialog).

			The markup has no handlers: presses on the days and buttons and the
			hover are caught by the pointer plugin, keys by the keyboard plugin;
			both listen to the root and call the collection's commands, otherwise
			"pressed ⇄ chosen" would repeat in each of the six adapters. The month
			and year panel lies in the same root, and the pointer plugin catches
			presses on its header and backdrop the same way.

			No default slot: the calendar's view puts the days into the
			collection by the grids' months, and a day from markup would enter it
			past the view.
		-->

		<!--
			The months stand in a row of their own: the row wraps them when they
			do not fit, and the footer is a separate row below. A footer in the
			months' row would widen it, and the paging buttons at the root's end
			would hang past the last column.
		-->
		<div class="so-calendar__months">
			<!--
				A month per grid (`grids`), keyed by the grid's place, not its month.
				The title and its picker belong to the place: paging changes the
				month, and the title button, its popover and the live region stay the
				same nodes. Otherwise a month chosen in the panel would rebuild the
				block with the button, the focus the panel returns to it would drop to
				the page, and the screen reader would not announce the change: a new
				live region does not read its first content. The days are rebuilt on
				a month change — they are keyed by date. The theme holds the height
				of six weeks, so neighboring grids stay level by rows.
			-->
			<div v-for="(grid, index) in grids" :key="index" class="so-calendar__month">
				<!--
					The month's title is a button that opens the month and year panel.
					The panel is the place's Popover (`pickers[index]`): the popover and
					list instances come ready from the collection's `picker` extension,
					and the markup computes nothing — neither openness nor contents.

					The popover is inside the calendar (`contained`): the panel does not
					go to `body` and does not stand under the title, it slides from the
					top of the calendar, its nearest positioned ancestor (`edge="top"`).
					The theme stretches the panel over the whole calendar as a backdrop,
					and the choice is in the card at its top edge
					(`.so-calendar__picker`): a press on the backdrop closes the panel,
					caught by the pointer plugin. The gesture by the bar is the popover
					place's `swipe`; the card is swiped up, to its edge, and the bar is
					at its bottom. Popover draws the bar as the panel's direct child,
					otherwise the gesture plugin does not know it. The popover's root is
					a `div`: the panel lies in it, and block markup has no place inside
					an inline `span`.

					The button gets the link to the panel (`aria-haspopup`,
					`aria-expanded`, `aria-controls`) and the "pressed" look from the
					trigger slot's scope. It has no view: the theme declares the view's
					values and paints it by context (`.so-calendar__title`).

					The text is in a nested `span` with the `grid.titleAria` set: the
					`id` the grid is named by (`aria-labelledby`) and `aria-live`, so
					the screen reader announces the month change itself. The set is on
					the text, not on the button: the live region is the text, not the
					control. Not `h*`: the page knows the heading level, and the
					calendar stands anywhere.

					The panel is named by its header (`labelledBy` — the header's `id`,
					written by the calendar's links plugin).
				-->
				<Popover
					v-if="pickers[index]"
					embedded="calendar.picker"
					class="so-calendar__heading"
					tag="div"
					contained
					edge="top"
					:ctrl="pickers[index].popover"
					:aria_labelledBy="pickers[index].labelledBy"
				>
					<template #trigger="{ triggerAria, triggerDataset }">
						<Button
							embedded="calendar.title"
							type="button"
							class="so-calendar__title"
							:size="size"
							:disabled="disabled"
							v-bind="{ ...triggerAria, ...triggerDataset }"
						>
							<span class="so-calendar__title-text" v-bind="grid.titleAria">{{
								grid.title
							}}</span>
						</Button>
					</template>

					<!--
						The panel's content is a card: the list and the header. The list is
						the place's ListBox: the months of a year or the years of a page, 12
						each; the theme lays them out in 4 columns by 3 rows. The `picker`
						extension catches the choice in it — by the list's event, not by a
						handler here. A label wider than its tile wraps between words — a
						month's name of several words (`vi-VN` — "Tháng 10") and a year's
						label (with an era at `th-TH`, "พ.ศ. 2569"). The same extension sets
						the list's `contentFit` when it creates the list, and the markup does
						not pass it.

						The place gets its list with the first opening of the popover — the
						`change:open` that mounts this content — so the ListBox is drawn by the
						presence of `list` and takes `ctrl` and `engine` from it.

						The list comes before the header in the DOM: focus on opening lands on
						the panel's first stop — the list with the selected month, not the year
						button. The theme puts the header on top, like the buttons in the row
						of the Dialog's title.
					-->
					<div class="so-calendar__picker">
						<ListBox
							v-if="pickers[index].list"
							embedded="calendar.picker-list"
							class="so-calendar__picker-list"
							:ctrl="pickers[index].list.ctrl"
							:engine="pickers[index].list.engine"
							:size="size"
							indicator="none"
							:aria_labelledBy="pickers[index].labelledBy"
						/>

						<!--
							The header is the card's first row, laid out as the calendar's
							title row: the year or the span of years at the start, the arrows
							tight at the end, the same size as the paging buttons and the
							month's title. In the DOM the year button comes before the arrows —
							Tab follows the eye. The year button switches the level: months ⇄
							years; the arrows page a year on months and 12 years on years. The
							calendar's pointer plugin catches the presses. The arrows' names
							and disabled state are the level's, from the panel's output; the
							icon is the same `arrowRight` role as the paging buttons', the
							theme mirrors "back".
						-->
						<div class="so-calendar__picker-header">
							<Button
								embedded="calendar.picker-heading"
								type="button"
								class="so-calendar__picker-heading"
								:size="size"
								v-bind="pickers[index].headingAria"
							>
								{{ pickers[index].heading }}
							</Button>

							<Button
								embedded="calendar.picker-prev"
								type="button"
								class="so-calendar__picker-prev"
								:size="size"
								:disabled="pickers[index].prevDisabled"
								v-bind="pickers[index].prevAria"
							>
								<Icon
									embedded="calendar.picker-prev-icon"
									:tag="arrowIconTag"
									:size="size"
								/>
							</Button>

							<Button
								embedded="calendar.picker-next"
								type="button"
								class="so-calendar__picker-next"
								:size="size"
								:disabled="pickers[index].nextDisabled"
								v-bind="pickers[index].nextAria"
							>
								<Icon
									embedded="calendar.picker-next-icon"
									:tag="arrowIconTag"
									:size="size"
								/>
							</Button>
						</div>
					</div>
				</Popover>

				<!--
					The paging buttons — one pair for the whole calendar: "back" and
					"forward" move all grids at once. On screen the pair stands at the
					end of the titles' row, over the last two columns, as in Android's
					calendar, and the month's title at the row's start. In the DOM it
					comes right after the first month's title, so Tab follows the eye:
					the title, "back", "forward", the grid's stop (one for all grids),
					the next months' titles. The place is at the first grid, not the
					last: it does not change with the number of grids. The theme places
					the pair from the calendar's root, not from the month's block.

					The markup passes the buttons no view: the theme paints them by
					context (`:where(.so-calendar__prev)`), as Scroller's buttons. The
					collection's view computes the disabled state — "the calendar is
					disabled or the grids reached the bound's month". The icon is the
					`arrowRight` role on both: the icon contract has no "left" role, the
					theme mirrors "back", in RTL "forward".
				-->
				<template v-if="index === 0">
					<Button
						embedded="calendar.prev"
						type="button"
						class="so-calendar__prev"
						:size="size"
						:disabled="prevDisabled"
						v-bind="prevAria"
					>
						<slot name="prev-icon">
							<Icon embedded="calendar.prev-icon" :tag="arrowIconTag" :size="size" />
						</slot>
					</Button>

					<Button
						embedded="calendar.next"
						type="button"
						class="so-calendar__next"
						:size="size"
						:disabled="nextDisabled"
						v-bind="nextAria"
					>
						<slot name="next-icon">
							<Icon embedded="calendar.next-icon" :tag="arrowIconTag" :size="size" />
						</slot>
					</Button>
				</template>

				<!--
					The grid — a `table` with the `grid.gridAria` set (`role="grid"`, the
					name from the title, `aria-multiselectable`).
				-->
				<table class="so-calendar__grid" v-bind="grid.gridAria">
					<!--
						The weekdays — labels from `weekdays`, a `th` per day: the short
						name or the narrow one, as the core chose by the locale.

						The row is hidden from the screen reader, a departure from the APG,
						where the columns have headers: a day's name is the full date with
						its weekday in it, and a labelled column would read it twice. So
						the `th` needs no `abbr` either.
					-->
					<thead aria-hidden="true">
						<tr class="so-calendar__weekdays">
							<th
								v-for="(weekday, index) in weekdays"
								:key="index"
								class="so-calendar__weekday"
							>
								{{ weekday.label }}
							</th>
						</tr>
					</thead>

					<tbody>
						<!--
							A week — seven cells from the first day of the week, keyed by its
							place in the grid: a new first day of the week keeps six days of
							seven in their row.
						-->
						<tr
							v-for="(week, place) in grid.weeks"
							:key="place"
							class="so-calendar__week"
						>
							<!--
								A cell is keyed by date: a day that stays on screen when paging
								is not rebuilt and keeps the focus.
							-->
							<template v-for="cell in week" :key="cell.date">
								<!--
									A day — `Calendar.Item` over the collection item `cell.item`.
									Its content is the `item` slot with the scope `{ item, text }`
									(a price, an event dot), `text` being the day's number in the
									locale's digits; without it the day draws its number.

									The slot is relayed only when it is given: the relay refers to
									the loop's `cell`, and Vue redraws an item with such slots on
									every redraw of the calendar (AGENTS.md, Pitfalls) — every day
									of the month on an opening of DatePicker.
								-->
								<CalendarItem v-if="cell.item && $slots.item" :ctrl="cell.item">
									<template #default="{ text }">
										<slot name="item" :item="cell.item" :text="text" />
									</template>
								</CalendarItem>
								<CalendarItem v-else-if="cell.item" :ctrl="cell.item" />

								<!--
									A filler — a day of the neighboring month, the cell has no
									item. It is not a day: no number, no states, no focus — a
									number would repeat a date that stands in the neighboring
									grid. The empty cell holds the place in the week and gets the
									cell's set (`cell.aria` — hidden from the screen reader).
								-->
								<td v-else class="so-calendar__filler" v-bind="cell.aria"></td>
							</template>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!--
			The footer — a row under the grids across the whole calendar: the
			actions the consumer puts there (DatePicker with `confirmable` —
			"Cancel" and "OK"). In the DOM it comes after the grids: its Tab stops
			are the last. The wrapper is drawn only when the slot is given — an
			empty row would hold a place under the grids.
		-->
		<div v-if="$slots.footer" class="so-calendar__footer">
			<slot name="footer" />
		</div>
	</component>
</template>
