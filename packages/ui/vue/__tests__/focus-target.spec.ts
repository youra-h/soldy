/**
 * Запись `focused = true` ставит фокус туда, где он у компонента живёт.
 *
 * У поля корень — коробка вокруг `<input>`, у ListBox — рамка вокруг узла
 * списка с шапкой и подвалом, у Tabs — рамка со списком табов и панелями.
 * Запись ставила фокус корню, а он его не держит: фокус оставался, где был, а
 * `focused` показывал неправду. Узел называет правило дескриптора
 * (`focusTarget` плагина действия): `fieldOf`, `listOf`, `tabStopOf`. Правила
 * по отдельности проверяет `plugins/__tests__/action.plugin.spec.ts`, здесь —
 * что они находят узел в настоящей разметке, в том числе когда перед главной
 * частью стоит своя остановка Tab.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
	TCheckBox,
	TInput,
	TListBox,
	TNumberInput,
	TRadioGroupItem,
	TRating,
	TSelect,
	TSlider,
	TSwitch,
	TTabs,
	TTextarea,
	createEngineTabs,
} from '@soldy-ui/core'
import {
	CheckBox,
	Input,
	ListBox,
	ListBoxItem,
	NumberInput,
	RadioGroup,
	RadioGroupItem,
	Rating,
	Select,
	SelectItem,
	Slider,
	Switch,
	Tabs,
	TabsItem,
	Textarea,
} from '@soldy-ui/vue'

/**
 * Кадр: плагин действия встаёт по `ready` корня, а `TElementPlugin`
 * объявляет узел через `requestAnimationFrame`.
 */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const components = {
	CheckBox,
	Input,
	ListBox,
	ListBoxItem,
	NumberInput,
	RadioGroup,
	RadioGroupItem,
	Rating,
	Select,
	SelectItem,
	Slider,
	Switch,
	Tabs,
	TabsItem,
	Textarea,
}

type TCase = {
	/**
	 * Инстанс, которому пишут `focused`. Тип — только свойство: карта событий
	 * у каждого контрола своя, и общего типа инстанса у них нет.
	 */
	ctrl: () => { focused: boolean }
	/** Разметка; инстанс в ней — `ctrl`. Плоские имена: точка в строковом шаблоне не работает. */
	template: string
	/** Узел, который держит фокус компонента. */
	target: string
	/** Своя остановка Tab перед главной частью: фокус на неё уйти не должен. */
	before?: string
}

const CASES: Record<string, TCase> = {
	Input: { ctrl: () => new TInput(), template: '<Input :ctrl="ctrl" />', target: 'input' },
	'Input с кнопкой в leading': {
		ctrl: () => new TInput(),
		template: `
			<Input :ctrl="ctrl">
				<template #leading><button class="before">Найти</button></template>
			</Input>
		`,
		target: 'input',
		before: '.before',
	},
	NumberInput: {
		ctrl: () => new TNumberInput(),
		template: '<NumberInput :ctrl="ctrl" />',
		target: '.so-number-input__input',
	},
	Textarea: {
		ctrl: () => new TTextarea(),
		template: '<Textarea :ctrl="ctrl" />',
		target: 'textarea',
	},
	CheckBox: {
		ctrl: () => new TCheckBox(),
		template: '<CheckBox :ctrl="ctrl" />',
		target: 'input',
	},
	Switch: { ctrl: () => new TSwitch(), template: '<Switch :ctrl="ctrl" />', target: 'input' },
	Rating: { ctrl: () => new TRating(), template: '<Rating :ctrl="ctrl" />', target: 'input' },
	Slider: { ctrl: () => new TSlider(), template: '<Slider :ctrl="ctrl" />', target: 'input' },
	Select: {
		ctrl: () => new TSelect(),
		template: `
			<Select :ctrl="ctrl">
				<SelectItem value="a" text="A" />
			</Select>
		`,
		target: '.so-select__field input',
	},
	'Select multiple с тегами': {
		ctrl: () => new TSelect(),
		template: `
			<Select :ctrl="ctrl" mode="multiple" :value="['a', 'b']">
				<SelectItem value="a" text="A" />
				<SelectItem value="b" text="B" />
			</Select>
		`,
		target: '.so-select__field input',
		// Крестик тега — нативная остановка перед полем
		before: '.so-tags-item__close',
	},
	'RadioGroup.Item': {
		ctrl: () => new TRadioGroupItem({ value: 'b' }),
		template: `
			<RadioGroup>
				<RadioGroupItem value="a" />
				<RadioGroupItem :ctrl="ctrl" class="target" />
			</RadioGroup>
		`,
		target: '.target input',
	},
	ListBox: {
		ctrl: () => new TListBox(),
		template: `
			<ListBox :ctrl="ctrl">
				<ListBoxItem value="a" text="A" />
			</ListBox>
		`,
		target: '[role="listbox"]',
	},
	'ListBox с полем в header': {
		ctrl: () => new TListBox(),
		template: `
			<ListBox :ctrl="ctrl">
				<template #header><input class="before" /></template>
				<ListBoxItem value="a" text="A" />
			</ListBox>
		`,
		target: '[role="listbox"]',
		before: '.before',
	},
	Tabs: {
		ctrl: () => new TTabs(),
		template: `
			<Tabs :ctrl="ctrl">
				<TabsItem value="a" text="A" />
				<TabsItem value="b" text="B" active />
			</Tabs>
		`,
		target: '[role="tab"][aria-selected="true"]',
	},
	'Tabs с кнопкой в leading': {
		ctrl: () => new TTabs(),
		template: `
			<Tabs :ctrl="ctrl">
				<template #leading><button class="before">+</button></template>
				<TabsItem value="a" text="A" />
				<TabsItem value="b" text="B" active />
			</Tabs>
		`,
		target: '[role="tab"][aria-selected="true"]',
		before: '.before',
	},
}

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Узел по селектору в документе; нет его — тест падает здесь. */
function nodeOf(selector: string): Element {
	const node = document.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

describe.each(Object.entries(CASES))('%s', (_name, { ctrl: create, template, target, before }) => {
	it('focused = true — фокус на узле компонента, false — снят', async () => {
		const ctrl = create()

		wrapper = mount(
			{ components, setup: () => ({ ctrl }), template },
			{ attachTo: document.body },
		)

		await nextTick()
		await nextFrame()

		// Разбор не вхолостую: своя остановка перед главной частью есть
		if (before) expect(nodeOf(before)).toBeInstanceOf(HTMLElement)

		ctrl.focused = true

		expect(document.activeElement).toBe(nodeOf(target))
		expect(ctrl.focused).toBe(true)

		ctrl.focused = false

		expect(document.activeElement).toBe(document.body)
		expect(ctrl.focused).toBe(false)
	})
})

describe('Tabs · остановка по модели', () => {
	/**
	 * Активный таб сменился в том же такте, что и запись `focused`: Vue
	 * перерисует `tabindex` только в следующем, а остановку правило берёт у
	 * модели, — фокус встаёт на новый таб, а не на прежнюю остановку.
	 */
	it('смена активного и focused = true в одном такте — фокус на новом табе', async () => {
		const ctrl = new TTabs()
		const engine = createEngineTabs({
			items: [
				{ value: 'a', text: 'A', _: { active: true } },
				{ value: 'b', text: 'B' },
			],
		})

		wrapper = mount(Tabs, { props: { ctrl, engine }, attachTo: document.body })

		await nextTick()
		await nextFrame()

		const b = engine.extensions.batch.items.find((item) => item.value === 'b')

		if (!b) throw new Error('таба b нет')

		engine.extensions.activation.activate(b)

		// Такт тот же: остановка в разметке ещё у прежнего активного
		expect(nodeOf('[role="tab"][tabindex="0"]').textContent?.trim()).toBe('A')

		ctrl.focused = true

		expect(document.activeElement?.textContent?.trim()).toBe('B')
		expect(document.activeElement?.getAttribute('role')).toBe('tab')
	})
})
