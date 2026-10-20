/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * Сценарии — те же, что у Vue (`focus-target.spec.ts`), по компонентам
 * адаптера. У поля корень — коробка вокруг `<input>`, у ListBox — рамка
 * вокруг узла списка, у Tabs — рамка со списком табов и панелями, у группы
 * радио и аккордеона — контейнер остановок, у элемента коллекции — обёртка
 * вокруг строки; узел фокуса называет правило дескриптора (`focusTarget`
 * плагина действия).
 *
 * Своё у React — `act`: запись `focused` и фокус меняют состояние компонентов
 * (у Tabs — ещё и таба), и обновление мимо `act` роняет тест сторожем консоли.
 */

import { describe, it, expect } from 'vitest'
import { act, type ReactElement } from 'react'
import {
	TAccordion,
	TAccordionItem,
	TCheckBox,
	TInput,
	TListBox,
	TListBoxItem,
	TRadioGroup,
	TRadioGroupItem,
	TSwitch,
	TTabs,
	TTabsItem,
	createEngineTabs,
} from '@soldy-ui/core'
import { Accordion, CheckBox, Input, ListBox, RadioGroup, Switch, Tabs } from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

type TCase = {
	/**
	 * Разметка и инстанс, которому тест пишет `focused`. Тип инстанса — только
	 * свойство: карта событий у каждого контрола своя.
	 */
	render: () => { ctrl: { focused: boolean }; node: ReactElement }
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: <Input ctrl={ctrl} /> }
		},
		target: 'input',
	},
	'Input с кнопкой в leading': {
		render: () => {
			const ctrl = new TInput()

			return { ctrl, node: <Input ctrl={ctrl} leading={<button className="before" />} /> }
		},
		target: 'input',
		before: '.before',
	},
	CheckBox: {
		render: () => {
			const ctrl = new TCheckBox()

			return { ctrl, node: <CheckBox ctrl={ctrl} /> }
		},
		target: 'input',
	},
	Switch: {
		render: () => {
			const ctrl = new TSwitch()

			return { ctrl, node: <Switch ctrl={ctrl} /> }
		},
		target: 'input',
	},
	'RadioGroup.Item': {
		render: () => {
			const ctrl = new TRadioGroupItem({ value: 'b' })

			return {
				ctrl,
				node: (
					<RadioGroup>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item ctrl={ctrl} className="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	ListBox: {
		render: () => {
			const ctrl = new TListBox()

			return {
				ctrl,
				node: (
					<ListBox ctrl={ctrl}>
						<ListBox.Item value="a" text="A" />
					</ListBox>
				),
			}
		},
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		render: () => {
			const ctrl = new TListBox()

			return {
				ctrl,
				node: (
					<ListBox ctrl={ctrl} header={<input className="before" />}>
						<ListBox.Item value="a" text="A" />
					</ListBox>
				),
			}
		},
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		render: () => {
			const ctrl = new TTabs()

			return {
				ctrl,
				node: (
					<Tabs ctrl={ctrl}>
						<Tabs.Item value="a" text="A" />
						<Tabs.Item value="b" text="B" active />
					</Tabs>
				),
			}
		},
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		render: () => {
			const ctrl = new TTabs()

			return {
				ctrl,
				node: (
					<Tabs ctrl={ctrl} leading={<button className="before" />}>
						<Tabs.Item value="a" text="A" />
						<Tabs.Item value="b" text="B" active />
					</Tabs>
				),
			}
		},
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
	'RadioGroup с отметкой': {
		render: () => {
			const ctrl = new TRadioGroup({ value: 'b' })

			return {
				ctrl,
				node: (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" />
						<RadioGroup.Item value="b" className="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	'RadioGroup без отметки, первое выключено': {
		render: () => {
			const ctrl = new TRadioGroup()

			return {
				ctrl,
				node: (
					<RadioGroup ctrl={ctrl}>
						<RadioGroup.Item value="a" disabled />
						<RadioGroup.Item value="b" className="target" />
					</RadioGroup>
				),
			}
		},
		target: '.target input',
	},
	Accordion: {
		render: () => {
			const ctrl = new TAccordion()

			return {
				ctrl,
				node: (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" className="target" />
						<Accordion.Item value="b" text="B" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'Accordion, первая секция выключена': {
		render: () => {
			const ctrl = new TAccordion()

			return {
				ctrl,
				node: (
					<Accordion ctrl={ctrl}>
						<Accordion.Item value="a" text="A" disabled />
						<Accordion.Item value="b" text="B" className="target" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'Tabs.Item': {
		render: () => {
			const ctrl = new TTabsItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: (
					<Tabs>
						<Tabs.Item value="a" text="A" active />
						<Tabs.Item ctrl={ctrl} className="target" />
					</Tabs>
				),
			}
		},
		target: '.target [role="tab"]',
	},
	'Accordion.Item': {
		render: () => {
			const ctrl = new TAccordionItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: (
					<Accordion>
						<Accordion.Item value="a" text="A" />
						<Accordion.Item ctrl={ctrl} className="target" />
					</Accordion>
				),
			}
		},
		target: '.target .so-accordion-item__header',
	},
	'ListBox.Item': {
		render: () => {
			const ctrl = new TListBoxItem({ value: 'b', text: 'B' })

			return {
				ctrl,
				node: (
					<ListBox>
						<ListBox.Item value="a" text="A" />
						<ListBox.Item ctrl={ctrl} className="target" />
					</ListBox>
				),
			}
		},
		target: '.target [role="option"]',
	},
}

describe.each(Object.entries(CASES))('%s', (_name, { render, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const { ctrl, node } = render()

		mount(node)
		await nextFrame()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) find(document, before, HTMLElement)

		act(() => {
			ctrl.focused = true
		})

		expect(document.activeElement).toBe(find(document, target, HTMLElement))
		expect(ctrl.focused).toBe(true)

		act(() => {
			ctrl.focused = false
		})

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: React
	 * перерисует `tabindex` после `act`, а остановку правило берёт у модели, —
	 * фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		mount(<Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')
		const stop = () => find(document, '[role="tab"][tabindex="0"]', HTMLElement)

		if (!b) throw new Error('таба b нет')

		act(() => {
			engine.extensions.activation.activate(b)

			// Такт тот же: остановка в разметке ещё у прежнего активного
			expect(stop().textContent?.trim()).toBe('A')

			ctrl.focused = true
		})

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})

	/**
	 * Таб добавили в движок и сделали активным в том же такте, что и запись
	 * `focused`: остановка в модели — он, а его узла в разметке нет, и корень
	 * Tabs фокус не держит. Запись ждёт узла. React рисует таб на выходе из
	 * `act`, а в коллекцию таб входит эффектом, когда его узел уже привязан, —
	 * фокус встаёт на самом входе, внутри `act`, а не кадром позже.
	 */
	it('новый таб и focused = true в одном такте — после перерисовки фокус на нём', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({ items: [{ value: 'a', text: 'A', _: { active: true } }] })

		mount(<Tabs ctrl={ctrl} engine={engine} />)
		await nextFrame()

		act(() => {
			engine.extensions.activation.activate(
				engine.extensions.plain.push({ value: 'c', text: 'C' }),
			)
			ctrl.focused = true

			// Такт тот же: таба в разметке нет, фокуса — тоже, а запись не откатилась
			expect(document.querySelectorAll('[role="tab"]')).toHaveLength(1)
			expect(document.activeElement).toBe(document.body)
			expect(ctrl.focused).toBe(true)
		})

		expect(document.activeElement?.textContent?.trim()).toBe('C')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
		expect(ctrl.focused).toBe(true)
	})
})

describe('RadioGroup · отметка по модели', () => {
	/**
	 * Значение сменилось в том же такте, что и запись `focused`: React
	 * перепишет `checked` полей после `act`, а отмеченное радио правило берёт у
	 * модели, — фокус встаёт на новое радио, а не на прежнее.
	 */
	it('смена значения и focused = true в одном такте — фокус на новом радио', async () => {
		const ctrl = new TRadioGroup({ value: 'a' })

		mount(
			<RadioGroup ctrl={ctrl}>
				<RadioGroup.Item value="a" />
				<RadioGroup.Item value="b" className="target" />
			</RadioGroup>,
		)
		await nextFrame()

		const target = () => find(document, '.target input', HTMLInputElement)

		act(() => {
			ctrl.value = 'b'

			// Такт тот же: отмечено в разметке ещё прежнее
			expect(target().checked).toBe(false)

			ctrl.focused = true
		})

		expect(document.activeElement).toBe(target())
	})
})
