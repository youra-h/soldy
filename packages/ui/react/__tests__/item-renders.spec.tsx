/**
 * Re-renders of collection items in React.
 *
 * A collection item stands under the adapter's render boundary
 * (`withRenderBoundary`), as Table's rows do: the owner redraws itself on
 * every change of its own state — the open panel, the calendar's props — and
 * the items it draws are redrawn only by their own subscription and by a
 * change of their inputs (the instance and the relayed slots). Without the
 * boundary React redrew every day of the month with each redraw of Calendar,
 * four times on an opening of DatePicker, and every option with each opening
 * of Select (benchmarks/interaction/react.md).
 *
 * An item's render is counted by its assembly hook, which the item calls
 * exactly once per render. The spy is `vi.mock` with `spy: true` — the hooks
 * work as they are — and a mock covers the whole file, so the group lives
 * apart from the components' specs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { Accordion, Calendar, Select } from '@soldy-ui/react'
import { useSetupAccordionItem } from '../src/components/accordion/item/setup.component'
import { useSetupCalendarItem } from '../src/components/calendar/item/setup.component'
import { useSetupSelectItem } from '../src/components/select/item/setup.component'
import { find, mount, nextFrame } from './mount'

vi.mock('../src/components/accordion/item/setup.component', { spy: true })
vi.mock('../src/components/calendar/item/setup.component', { spy: true })
vi.mock('../src/components/select/item/setup.component', { spy: true })

const sectionRenders = vi.mocked(useSetupAccordionItem)
const dayRenders = vi.mocked(useSetupCalendarItem)
const optionRenders = vi.mocked(useSetupSelectItem)

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
})

/** A click as the browser sends it, in `act`. */
function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Dates of the days drawn since the last clear, sorted. */
const renderedDays = () => dayRenders.mock.calls.map(([props]) => props.ctrl?.date).sort()

describe('перерисовка дней Calendar', () => {
	it('календарь перерисован сменой пропа — дни нет', async () => {
		const view = (label: string) => <Calendar value="2026-09-10" aria_label={label} />
		const { render: rerender } = mount(view('Дата'))

		await nextFrame()

		// The days are drawn by this hook: otherwise the counter below would guard nothing
		expect(renderedDays()).toContain('2026-09-10')
		dayRenders.mockClear()

		rerender(view('Дата отъезда'))

		expect(find(document, '.so-calendar', HTMLElement).getAttribute('aria-label')).toBe(
			'Дата отъезда',
		)
		expect(renderedDays()).toEqual([])
	})

	it('выбор дня — перерисованы прежний и новый выбранный', async () => {
		mount(<Calendar value="2026-09-10" />)

		await nextFrame()
		dayRenders.mockClear()

		const day = [...document.querySelectorAll<HTMLElement>('.so-calendar-item')].find(
			(node) => node.textContent?.trim() === '15',
		)

		if (!day) throw new Error('нет дня 15')

		click(day)

		expect(day.dataset.selected).toBe('true')
		expect([...new Set(renderedDays())]).toEqual(['2026-09-10', '2026-09-15'])
	})
})

describe('перерисовка секций Accordion', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
		{ value: 'c', text: 'Третий' },
	]

	it('аккордеон со слотом item-content перерисован своим пропом — секции нет', async () => {
		// Stable reference, outside `view`: a new function on every test render
		// is as unstable as an uncompiled Vue slot, and sections would redraw
		// on a change of this prop, not of the owner.
		const itemContent = ({ item }: { item: { text: string } }) => item.text
		// `data-test-label` isn't an Accordion prop: it falls into the DOM
		// attribute and redraws the owner only, not its sections.
		const view = (label: string) => (
			<Accordion items={ITEMS} data-test-label={label} item-content={itemContent} />
		)
		const { render: rerender } = mount(view('Первое имя'))

		await nextFrame()

		expect(sectionRenders).toHaveBeenCalled()
		sectionRenders.mockClear()

		rerender(view('Второе имя'))

		expect(find(document, '.so-accordion', HTMLElement).getAttribute('data-test-label')).toBe(
			'Второе имя',
		)
		expect(sectionRenders).not.toHaveBeenCalled()
	})
})

describe('перерисовка опций Select', () => {
	const ITEMS = [
		{ value: 'a', text: 'Первый' },
		{ value: 'b', text: 'Второй' },
		{ value: 'c', text: 'Третий' },
	]

	it('открытие и закрытие панели — опции нет', async () => {
		mount(<Select items={ITEMS} />)

		await nextFrame()

		const arrow = find(document, '.so-select__arrow', HTMLElement)

		// Options from data are drawn from the panel's first opening on
		click(arrow)
		await nextFrame()
		click(arrow)
		await nextFrame()

		expect(optionRenders).toHaveBeenCalled()
		optionRenders.mockClear()

		click(arrow)
		await nextFrame()

		expect(find(document, '.so-select__panel', HTMLElement).dataset.open).toBe('true')

		click(arrow)
		await nextFrame()

		expect(find(document, '.so-select__panel', HTMLElement).dataset.open).toBe('false')
		expect(optionRenders).not.toHaveBeenCalled()
	})
})
