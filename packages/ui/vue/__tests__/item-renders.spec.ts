/**
 * Re-renders of the items an owner draws from data, in Vue.
 *
 * The owner relays its `item*` slots to each item only when it has any of
 * them: a relay refers to the loop variable, and Vue redraws a child with
 * such slots on every redraw of its parent (AGENTS.md, Pitfalls). Without the
 * branch every day of the month was redrawn on each opening of DatePicker,
 * every option on each opening of Select (benchmarks/interaction/vue.md).
 *
 * Nothing in the DOM shows an extra redraw — the values are the same — so the
 * renders are counted: the updates of components by name, with a global mixin.
 * The owner is redrawn by a change of its own prop (`aria_label` — it is in
 * the owner's `aria` set, which its template reads), and its items are not.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Component, type ComponentOptions } from 'vue'
import {
	Accordion,
	Calendar,
	DatePicker,
	ListBox,
	Menu,
	Pagination,
	RadioGroup,
	Select,
	Tabs,
	Tags,
} from '@soldy-ui/vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
	vi.useRealTimers()
})

/** A redraw and a frame: new nodes announce themselves to the plugins a frame later. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
	await nextTick()
}

/** Updates by component name since the last `reset`. */
function watchUpdates() {
	const updates = new Map<string, number>()
	const mixin: ComponentOptions = {
		beforeUpdate() {
			const name = this.$options.name

			if (name) updates.set(name, (updates.get(name) ?? 0) + 1)
		},
	}

	return { mixin, count: (name: string) => updates.get(name) ?? 0, reset: () => updates.clear() }
}

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/**
 * Owners that draw their items from data, with the props they are drawn by,
 * their component's name and their items'. The items are mounted at the start:
 * Select and Menu draw them from the panel's first opening on, so they are
 * open (`open`).
 */
const OWNERS: ReadonlyArray<{
	name: string
	owner: Component
	props: Record<string, unknown>
	self: string
	item: string
	selector: string
}> = [
	{
		name: 'Calendar',
		owner: Calendar,
		props: { value: '2026-09-10' },
		self: '_Calendar',
		item: '_CalendarItem',
		selector: '.so-calendar-item',
	},
	{
		name: 'Select',
		owner: Select,
		props: { items: ITEMS, open: true },
		self: '_Select',
		item: '_SelectItem',
		selector: '.so-select-item',
	},
	{
		name: 'ListBox',
		owner: ListBox,
		props: { items: ITEMS },
		self: '_ListBox',
		item: '_ListBoxItem',
		selector: '.so-list-box-item',
	},
	{
		name: 'Menu',
		owner: Menu,
		props: { items: ITEMS, open: true },
		self: '_Menu',
		item: '_MenuItem',
		selector: '.so-menu-item',
	},
	{
		name: 'Tabs',
		owner: Tabs,
		props: { items: ITEMS },
		self: '_Tabs',
		item: '_TabsItem',
		selector: '.so-tabs-item',
	},
	{
		name: 'Tags',
		owner: Tags,
		props: { items: ITEMS },
		self: '_Tags',
		item: '_TagsItem',
		selector: '.so-tags-item',
	},
	{
		name: 'Accordion',
		owner: Accordion,
		props: { items: ITEMS },
		self: '_Accordion',
		item: '_AccordionItem',
		selector: '.so-accordion-item',
	},
	{
		name: 'RadioGroup',
		owner: RadioGroup,
		props: { items: ITEMS },
		self: '_RadioGroup',
		item: '_RadioGroupItem',
		selector: '.so-radio-group-item',
	},
	{
		name: 'Pagination',
		owner: Pagination,
		props: { total: 100 },
		self: '_Pagination',
		item: '_PaginationItem',
		selector: '.so-pagination-item',
	},
]

describe('перерисовка элементов из данных', () => {
	it.each(OWNERS)('$name перерисован своим пропом — элементы нет', async (entry) => {
		const { mixin, count, reset } = watchUpdates()
		const label = ref('Первое имя')

		wrapper = mount(
			defineComponent({
				render: () => h(entry.owner, { ...entry.props, aria_label: label.value }),
			}),
			{ attachTo: document.body, global: { mixins: [mixin] } },
		)
		await settle()

		// The items are drawn: otherwise the counter below would guard nothing
		expect(document.querySelectorAll(entry.selector).length).toBeGreaterThan(0)
		reset()

		label.value = 'Второе имя'
		await settle()

		expect(count(entry.self)).toBeGreaterThan(0)
		expect(count(entry.item)).toBe(0)
	})

	it('DatePicker открыт и закрыт — дни календаря нет', async () => {
		const { mixin, count, reset } = watchUpdates()
		const open = ref(true)

		wrapper = mount(
			defineComponent({
				render: () => h(DatePicker, { value: '2026-09-10', open: open.value }),
			}),
			{ attachTo: document.body, global: { mixins: [mixin] } },
		)
		await settle()

		open.value = false
		await settle()

		expect(document.querySelectorAll('.so-calendar-item').length).toBeGreaterThan(0)
		reset()

		open.value = true
		await settle()
		open.value = false
		await settle()

		expect(count('_DatePicker')).toBeGreaterThan(0)
		expect(count('_CalendarItem')).toBe(0)
	})
})
