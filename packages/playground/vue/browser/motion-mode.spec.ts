/**
 * Режим движения библиотеки в настоящем браузере — у каждого компонента, чьё
 * движение рисует тема, и у листания ленты.
 *
 * Режим один на библиотеку (корневой `AGENTS.md`, «Движение: один режим на
 * библиотеку»). По умолчанию — настройка системы `prefers-reduced-motion`, а
 * приложение задаёт свой (`useMotion`): `full` — движение и тогда, когда
 * система просит его убрать, `reduce` — без движения и тогда, когда не
 * просит. Состояний поэтому четыре: система × режим приложения. Систему
 * эмулирует Chromium (`media.ts`), режим ставит сам `useMotion`.
 *
 * Тема исполняет режим одной надстройкой (`themes/oren/src/mixins/_motion.scss`);
 * что каждое правило движения идёт через неё, сторожит собранный CSS
 * (`themes/oren/__tests__/motion.spec.ts`). Здесь — что из этого выходит на
 * узле: что вычислил браузер в списке переходов и в имени анимации узла или
 * его псевдоэлемента. У ленты — с каким поведением она листает
 * (`scrollBy`): плавность прокрутки читает плагин.
 *
 * Как выглядит то, что идёт без движения (мерцание индикаторов, проявление
 * Drawer), — в спеках компонентов: `progress-linear.spec.ts`,
 * `progress-spinner.spec.ts`, `drawer.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { useMotion } from '@soldy-ui/plugins'
import type { TMotionMode } from '@soldy-ui/plugins'
import {
	Accordion,
	AccordionItem,
	Calendar,
	DatePicker,
	Drawer,
	Popover,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	RadioGroupItem,
	Scroller,
	Select,
	SelectItem,
	Skeleton,
	Slider,
	Switch,
	Tabs,
	TabsItem,
} from '@soldy-ui/vue'

import { reducedMotion } from './media'
import { settled } from './transitions'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице, узлы объявлены плагинам: `TElementPlugin` ждёт кадр. */
const show = async (scene: () => VNode) => {
	render(defineComponent({ render: scene }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору — и SVG тоже; нет его — тест падает здесь. */
const node = (selector: string): Element => {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Список переходов узла или его псевдоэлемента, как его вычислил браузер. */
const transitions = (selector: string, pseudo?: string): string[] =>
	getComputedStyle(node(selector), pseudo)
		.transitionProperty.split(',')
		.map((name) => name.trim())

/** Ведёт ли переход узла свойство. Без надстройки список — `all` с нулём. */
const transitionsOf = (selector: string, property: string, pseudo?: string) => (): boolean =>
	transitions(selector, pseudo).includes(property)

/** Имя анимации узла или его псевдоэлемента. */
const animationOf = (selector: string, pseudo?: string) => (): string =>
	getComputedStyle(node(selector), pseudo).animationName

/** Плагин темы замерил табы: геометрия активного таба записана. */
const tabsMeasured = async () => {
	await expect
		.poll(() => node('.s-tabs').classList.contains('s-tabs--ready-animation'))
		.toBe(true)
}

const tabs = (view?: 'contained') => () =>
	h('div', { style: 'width: 480px' }, [
		h(Tabs, { view }, () =>
			['Настройки', 'Почта', 'Архив'].map((text, index) =>
				h(TabsItem, { key: text, value: String(index), text, active: index === 0 }),
			),
		),
	])

type TCase = {
	readonly name: string
	/** Сцена на странице — разметка и всё, что нужно до чтения стиля. */
	readonly mount: () => Promise<void>
	/** Что видно по вычисленному стилю. */
	readonly look: () => unknown
	/** Что должно быть видно, когда движение разрешено и когда нет. */
	readonly moving: unknown
	readonly still: unknown
}

/** Переход свойства: в движении он есть, без движения — нет. */
const transition = (
	name: string,
	mount: () => Promise<void>,
	selector: string,
	property: string,
	pseudo?: string,
): TCase => ({
	name,
	mount,
	look: transitionsOf(selector, property, pseudo),
	moving: true,
	still: false,
})

const CASES: readonly TCase[] = [
	transition(
		'Tabs line: полоса едет к новому табу',
		async () => {
			await show(tabs())
			await tabsMeasured()
		},
		'.s-tabs__list',
		'transform',
		'::after',
	),
	transition(
		'Tabs contained: карточка едет к новому табу',
		async () => {
			await show(tabs('contained'))
			await tabsMeasured()
		},
		'.s-tabs__list',
		'transform',
		'::before',
	),
	transition(
		'Slider: ход ручки',
		() => show(() => h('div', { style: 'width: 320px' }, [h(Slider, { value: 40 })])),
		'.s-slider__thumb',
		'inset-inline-start',
	),
	transition(
		'Slider: ход заливки',
		() => show(() => h('div', { style: 'width: 320px' }, [h(Slider, { value: 40 })])),
		'.s-slider__range',
		'inset-inline-start',
	),
	transition(
		'ProgressLinear: переход доли',
		() => show(() => h(ProgressLinear, { value: 40 })),
		'.s-progress-linear__range',
		'inline-size',
	),
	{
		name: 'ProgressLinear: бег, без движения — мерцание',
		mount: () => show(() => h(ProgressLinear, { indeterminate: true })),
		look: animationOf('.s-progress-linear', '::after'),
		moving: 's-progress-linear-run',
		still: 's-progress-pulse',
	},
	transition(
		'ProgressSpinner: переход доли',
		() => show(() => h(ProgressSpinner, { value: 40 })),
		'.s-progress-spinner__range',
		'stroke-dasharray',
	),
	{
		name: 'ProgressSpinner: бег рисунка',
		mount: () => show(() => h(ProgressSpinner, { indeterminate: true })),
		look: animationOf('.s-progress-spinner__ring'),
		moving: 's-progress-spinner-run',
		still: 'none',
	},
	{
		name: 'ProgressSpinner: без движения мерцает бегущая дуга',
		mount: () => show(() => h(ProgressSpinner, { indeterminate: true })),
		look: animationOf('.s-progress-spinner__runner'),
		moving: 'none',
		still: 's-progress-pulse',
	},
	transition(
		'Popover: въезд и уход панели',
		() =>
			show(() =>
				h(
					Popover,
					{ open: true, aria_label: 'Проверка' },
					{ trigger: () => h('button', 'Открыть'), default: () => 'Содержимое' },
				),
			),
		'.s-popover__panel',
		'translate',
	),
	transition(
		'Select: уход смахнутой панели от поля',
		() =>
			show(() =>
				h(Select, { open: true, swipe: 'handle' }, () => [
					h(SelectItem, { value: 'a', text: 'Москва' }),
				]),
			),
		'.s-select__panel',
		'translate',
	),
	transition(
		'DatePicker: уход смахнутой панели от поля',
		() => show(() => h(DatePicker, { open: true, swipe: 'handle', value: '2026-05-12' })),
		'.s-date-picker__panel',
		'translate',
	),
	transition(
		'Calendar: въезд карточки выбора месяца',
		async () => {
			await show(() => h(Calendar, { months: ['2026-09-01'] }))
			await userEvent.click(node('.s-calendar__title'))
			await expect
				.poll(
					() =>
						document.querySelectorAll('.s-calendar__picker-list .s-list-box-item')
							.length,
				)
				.toBe(12)
		},
		'.s-calendar__heading > .s-popover__panel > .s-popover__content',
		'translate',
	),
	{
		name: 'Drawer: въезд и выезд, без движения — прозрачность',
		mount: () =>
			show(() =>
				h(
					Drawer,
					{ visible: true },
					{ title: () => 'Фильтры', default: () => 'Содержимое' },
				),
			),
		look: () => transitions('.s-drawer'),
		moving: ['translate', 'display'],
		still: ['opacity', 'display'],
	},
	transition(
		'Accordion: поворот стрелки',
		() =>
			show(() =>
				h(Accordion, null, () => [
					h(
						AccordionItem,
						{ value: 'a', text: 'Секция', selected: true },
						{ default: () => 'Содержимое' },
					),
				]),
			),
		'.s-accordion-item__arrow',
		'rotate',
	),
	transition(
		'Accordion: раскрытие секции',
		() =>
			show(() =>
				h(Accordion, null, () => [
					h(
						AccordionItem,
						{ value: 'a', text: 'Секция', selected: true },
						{ default: () => 'Содержимое' },
					),
				]),
			),
		'.s-accordion-item__body',
		'grid-template-rows',
	),
	transition(
		'Select: поворот стрелки',
		() => show(() => h(Select, null, () => [h(SelectItem, { value: 'a', text: 'Москва' })])),
		'.s-select__arrow',
		'rotate',
	),
	transition(
		'Switch: ход ручки',
		() => show(() => h(Switch)),
		'.s-switch__track--thumb',
		'inset-inline-start',
	),
	transition(
		'RadioGroup: рост точки',
		() =>
			show(() =>
				h(RadioGroup, { value: 'a' }, () => [
					h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
				]),
			),
		'.s-radio-group-item__indicator',
		'scale',
	),
	transition(
		'RadioGroup: толщина кольца',
		() =>
			show(() =>
				h(RadioGroup, { value: 'a' }, () => [
					h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
				]),
			),
		'.s-radio-group-item__control',
		'border-width',
	),
	{
		name: 'Skeleton wave: блик, без движения — пульсация',
		mount: () => show(() => h(Skeleton, { animation: 'wave' })),
		look: () => [
			animationOf('.s-skeleton__placeholder')(),
			animationOf('.s-skeleton__placeholder', '::after')(),
		],
		moving: ['none', 'skeleton-wave'],
		still: ['skeleton-pulse', 'none'],
	},
]

/** Четыре состояния: просьба системы × режим приложения — и есть ли движение. */
const STATES: readonly {
	name: string
	system: 'reduce' | 'no-preference'
	mode: TMotionMode
	moves: boolean
}[] = [
	{ name: 'система не просит', system: 'no-preference', mode: 'system', moves: true },
	{ name: 'система просит меньше движения', system: 'reduce', mode: 'system', moves: false },
	{ name: 'система просит, приложение — full', system: 'reduce', mode: 'full', moves: true },
	{
		name: 'система не просит, приложение — reduce',
		system: 'no-preference',
		mode: 'reduce',
		moves: false,
	},
]

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	useMotion('system')
	await reducedMotion('no-preference')
})

describe.each(STATES)('$name', ({ system, mode, moves }) => {
	beforeEach(async () => {
		await reducedMotion(system)
		useMotion(mode)
	})

	it('эмуляция системы действует', () => {
		// Иначе все проверки ниже шли бы в одном состоянии
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(system === 'reduce')
	})

	it.each(CASES)('$name', async ({ mount, look, moving, still }) => {
		await mount()

		expect(look()).toEqual(moves ? moving : still)
	})

	it('Scroller: листает плавно только с движением', async () => {
		await show(() =>
			h('div', { style: 'width: 260px' }, [
				h(Scroller, null, () =>
					['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой'].map((text) =>
						h(
							'span',
							{ key: text, style: 'padding: 4px 12px; white-space: nowrap' },
							text,
						),
					),
				),
			]),
		)
		await expect.poll(() => node('.s-scroller').getAttribute('data-can-next')).toBe('true')

		// Поведение листания — то, что плагин отдал прокрутке
		const behaviors: (ScrollBehavior | undefined)[] = []

		Object.defineProperty(node('.s-scroller__viewport'), 'scrollBy', {
			configurable: true,
			value: (options: ScrollToOptions) => behaviors.push(options.behavior),
		})

		await userEvent.click(node('.s-scroller__next'))

		expect(behaviors).toEqual([moves ? 'smooth' : 'instant'])
	})

	/**
	 * Закрытие ждёт конца перехода, а замок прокрутки — конца переходов
	 * корня: и с движением (выезд), и без него (прозрачность) панель уходит
	 * в `display: none`, и прокрутка страницы возвращается.
	 */
	it('Drawer: закрытая панель исчезает, прокрутка страницы возвращается', async () => {
		const shown = ref(false)
		const locked = () => getComputedStyle(document.documentElement).overflow === 'hidden'
		const panel = () => node('.s-drawer')

		await show(() =>
			h('div', { style: 'height: 3000px' }, [
				h(
					Drawer,
					{
						visible: shown.value,
						'onUpdate:visible': (value: boolean) => {
							shown.value = value
						},
					},
					{ title: () => 'Фильтры', default: () => 'Содержимое' },
				),
			]),
		)

		shown.value = true
		await expect.poll(locked).toBe(true)
		await settled(panel())

		shown.value = false
		await expect.poll(() => getComputedStyle(panel()).display).toBe('none')
		await expect.poll(locked).toBe(false)
	})
})
