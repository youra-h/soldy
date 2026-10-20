/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`) и React
 * (`focus-target.spec.tsx`), по компонентам адаптера. У поля корень — коробка
 * вокруг `<input>`, у ListBox — рамка вокруг узла списка, у Tabs — рамка со
 * списком табов и панелями; узел фокуса называет правило дескриптора
 * (`focusTarget` плагина действия).
 *
 * Своё у Svelte — такт: смену состояния он применяет к DOM на своём такте, и
 * до `flushSync()` разметка отстаёт от модели.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import {
	TCheckBox,
	TInput,
	TListBox,
	TRadioGroupItem,
	TSwitch,
	TTabs,
	createEngineTabs,
} from '@soldy-ui/core'
import { CheckBox, Input, ListBox, Switch, Tabs } from '@soldy-ui/svelte'
import RadioGroupHarness from './RadioGroup.test.svelte'
import { find, mount, nextFrame } from './mount'
import { markup } from './snippets.svelte'

type TCase = {
	/**
	 * Монтирует компонент и отдаёт инстанс, которому тест пишет `focused`. Тип
	 * инстанса — только свойство: карта событий у каждого контрола своя.
	 */
	render: () => { focused: boolean }
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		render: () => {
			const ctrl = new TInput()

			mount(Input, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	'Input с кнопкой в leading': {
		render: () => {
			const ctrl = new TInput()

			mount(Input, { ctrl, leading: markup('<button class="before"></button>') })

			return ctrl
		},
		target: 'input',
		before: '.before',
	},
	CheckBox: {
		render: () => {
			const ctrl = new TCheckBox()

			mount(CheckBox, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	Switch: {
		render: () => {
			const ctrl = new TSwitch()

			mount(Switch, { ctrl })

			return ctrl
		},
		target: 'input',
	},
	'RadioGroup.Item': {
		render: () => {
			const ctrl = new TRadioGroupItem({ value: 'b' })

			mount(RadioGroupHarness, {
				items: [{ value: 'a' }, { ctrl, value: 'b', class: 'target' }],
			})

			return ctrl
		},
		target: '.target input',
	},
	ListBox: {
		render: () => {
			const ctrl = new TListBox()

			mount(ListBox, { ctrl, items: [{ value: 'a', text: 'A' }] })

			return ctrl
		},
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		render: () => {
			const ctrl = new TListBox()

			mount(ListBox, {
				ctrl,
				items: [{ value: 'a', text: 'A' }],
				header: markup('<input class="before" />'),
			})

			return ctrl
		},
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		render: () => {
			const ctrl = new TTabs()

			mount(Tabs, { ctrl, items: TABS })

			return ctrl
		},
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		render: () => {
			const ctrl = new TTabs()

			mount(Tabs, { ctrl, items: TABS, leading: markup('<button class="before"></button>') })

			return ctrl
		},
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
}

/** Табы данными: активный — второй, остановка Tab не совпадает с первым табом. */
const TABS = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B', _: { active: true } },
]

describe.each(Object.entries(CASES))('%s', (_name, { render, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const ctrl = render()

		await nextFrame()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) find(document, before, HTMLElement)

		ctrl.focused = true
		flushSync()

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false
		flushSync()

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: Svelte
	 * перерисует `tabindex` на своём такте, а остановку правило берёт у модели,
	 * — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		mount(Tabs, { ctrl, engine })
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(stop().textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})
})
