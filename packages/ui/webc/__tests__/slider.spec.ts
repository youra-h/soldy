/**
 * `<span is="so-slider">` — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`, `webc-controls.spec.ts`).
 * Сценарии — те же, что у Vue (`slider.spec.ts`), и сверх них, как у Solid:
 * ручки по месту — шаг клавишей не пересоздаёт ручку и её поле, — и значение
 * поля после хода.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, наборы на нём
 * раскладывает база, а набор корня — `rootAria`, не `aria`. Слоты со scope
 * (`mark`, `thumb`) — образцы: копию получает каждая метка и подсказка каждой
 * ручки, а данные копия берёт у элемента по месту своего узла.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TSlider, type TValuePayload } from '@soldy-ui/core'
import { SliderDescriptor } from '@soldy-ui/setup'
import {
	TLabelElement,
	TSliderElement,
	type TLabelElementProps,
	type TSliderElementProps,
} from '@soldy-ui/webc'
import { sliderTemplate } from '../src/components/slider/slider.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isSlider(node: Element | null): node is TSliderElementProps {
	return node instanceof TSliderElement
}

function isLabel(node: Element | null): node is TLabelElementProps {
	return node instanceof TLabelElement
}

/** Разметка в неподключённом узле: до вставки можно найти узлы и повесить слушатели. */
function markup(html: string): HTMLElement {
	const host = document.createElement('div')

	host.innerHTML = html

	return host
}

/** Ползунок soldy в разметке. */
function sliderOf(root: ParentNode): TSliderElementProps {
	const node = root.querySelector('[is="so-slider"]')

	if (!isSlider(node)) throw new Error('<span is="so-slider"> нет')

	return node
}

/**
 * Ползунок из разметки в документе; слушатели плагинов — кадром позже.
 * Свойства — до вставки: метки списком атрибутом не задать — первый тип пропа
 * `marks` булев, и атрибут значит «точки шкалы».
 */
async function mount(
	html: string,
	props: Partial<Pick<TSliderElementProps, 'marks'>> = {},
): Promise<TSliderElementProps> {
	const host = markup(html)
	const slider = sliderOf(host)

	Object.assign(slider, props)
	document.body.appendChild(host)
	await nextFrame()

	return slider
}

/** Ползунок над готовым инстансом: `ctrl` выставлен до подключения. */
async function mountCtrl(ctrl: TSlider): Promise<TSliderElementProps> {
	const node = document.createElement('span', { is: 'so-slider' })

	if (!isSlider(node)) throw new Error('<span is="so-slider"> нет')

	node.ctrl = ctrl
	document.body.appendChild(node)
	await nextFrame()

	return node
}

const all = (selector: string, root: ParentNode = document) =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

const fields = () => all('.so-slider__input').filter((node) => node instanceof HTMLInputElement)

function field(index = 0): HTMLInputElement {
	const node = fields()[index]

	if (!(node instanceof HTMLInputElement)) throw new Error(`поля ${index} нет`)

	return node
}

const position = (node: HTMLElement) => node.style.getPropertyValue('--so-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
async function press(target: HTMLElement, key: string): Promise<void> {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await flush()
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

/** Новое значение из пары события — вид проверяется здесь, а не берётся на веру. */
function newValueOf(detail: unknown): unknown {
	if (typeof detail !== 'object' || detail === null || !('newValue' in detail)) {
		throw new Error('у события нет пары значений')
	}

	return detail.newValue
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span и поля', async () => {
		const root = await mount('<span is="so-slider" direction="rtl" size="lg"></span>')

		expect(root).toBeInstanceOf(HTMLSpanElement)
		expect(root.classList.contains('so-slider')).toBe(true)
		expect(root.classList.contains('so-slider--horizontal')).toBe(true)
		expect(root.classList.contains('so-slider--size-lg')).toBe(true)
		expect(root.dataset.dragging).toBe('false')
		expect(root.dataset.disabled).toBe('false')
		expect(root.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полям, не корню
		expect(root.hasAttribute('aria-orientation')).toBe(false)
		expect(
			all('.so-slider *').filter((node) => !['span', 'input'].includes(node.localName)),
		).toEqual([])
	})

	it('тег у ядра — тег элемента: span', async () => {
		const ctrl = new TSlider()

		await mountCtrl(ctrl)

		expect(ctrl.tag).toBe('span')
	})

	it('части — прямыми детьми: дорожка у корня, ручки и заливка у дорожки, поле у ручки', async () => {
		const root = await mount('<span is="so-slider" value="[20,80]"></span>')
		const track = find(root, ':scope > .so-slider__track', HTMLElement)

		expect([...root.children]).toEqual([track])
		expect([...track.children].map((node) => node.className)).toEqual([
			'so-slider__range',
			'so-slider__thumb',
			'so-slider__thumb',
		])
		expect(all('.so-slider__thumb').map((thumb) => thumb.firstElementChild?.className)).toEqual(
			['so-slider__input', 'so-slider__input'],
		)
	})

	it('число — одна ручка, массив — по ручке на элемент', async () => {
		const root = await mount('<span is="so-slider" value="30"></span>')

		expect(all('.so-slider__thumb')).toHaveLength(1)

		root.value = [10, 50, 90]
		await flush()

		expect(all('.so-slider__thumb')).toHaveLength(3)
		expect(fields().map((node) => node.value)).toEqual(['10', '50', '90'])
	})

	it('поле ручки: ход, шаг, значение, name, disabled и имя', async () => {
		const root = await mount(`<span
			is="so-slider"
			value="[20,60]"
			min-steps-between-thumbs="1"
			step="5"
			name="price"
			orientation="vertical"
			thumb-labels='["От","До"]'
			aria_label="Цена"
		></span>`)
		const [first, second] = fields()

		expect(first.type).toBe('range')
		expect([first.min, first.max, first.step, first.value]).toEqual(['0', '55', '5', '20'])
		expect([second.min, second.max, second.value]).toEqual(['25', '100', '60'])
		expect(first.name).toBe('price')
		// Ориентация — на каждом поле, имя — у каждой ручки своё, из thumbLabels;
		// имя ползунка (aria_label) у нескольких ручек — у группы, корня
		expect([first, second].map((node) => node.getAttribute('aria-orientation'))).toEqual([
			'vertical',
			'vertical',
		])
		expect(first.getAttribute('aria-label')).toBe('От')
		expect(second.getAttribute('aria-label')).toBe('До')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(root.hasAttribute('aria-orientation')).toBe(false)
		expect(first.hasAttribute('aria-disabled')).toBe(false)
	})

	it('одна ручка: aria_label называет её поле, корень — без роли и имени', async () => {
		const root = await mount('<span is="so-slider" value="30" aria_label="Громкость"></span>')

		expect(field().getAttribute('aria-label')).toBe('Громкость')
		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
	})

	it('несколько ручек: корень — группа с aria_label, у полей его нет; выключенный — нативный disabled', async () => {
		const root = await mount(
			'<span is="so-slider" value="[20,60]" aria_label="Цена" disabled></span>',
		)

		expect(root.getAttribute('role')).toBe('group')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])
		expect(fields().every((node) => node.disabled)).toBe(true)
		expect(root.dataset.disabled).toBe('true')
	})

	it('число ручек сменилось — набор корня и полей за ним', async () => {
		const root = await mount('<span is="so-slider" value="30" aria_label="Цена"></span>')

		root.value = [20, 80]
		await flush()

		expect(root.getAttribute('role')).toBe('group')
		expect(root.getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])

		root.value = 50
		await flush()

		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
		expect(field().getAttribute('aria-label')).toBe('Цена')
	})

	it('у шага списком поле без шага: step="any"', async () => {
		await mount('<span is="so-slider" value="5" step="[1,5,10]"></span>')

		expect(field().step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', async () => {
		await mount('<span is="so-slider" value="[20,70]"></span>', { marks: [{ value: 50 }] })

		const range = find(document, '.so-slider__range', HTMLElement)

		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-start')).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-end')).toBe('70%')
		expect(position(find(document, '.so-slider__mark', HTMLElement))).toBe('50%')
	})

	/**
	 * Полей столько, сколько ручек, и атрибуты потребителя — корню, как у Vue:
	 * статические атрибуты разметки на поле не едут.
	 */
	it('атрибуты потребителя — корню: полей столько, сколько ручек', async () => {
		const root = await mount(
			'<span is="so-slider" value="[20,80]" class="mine" title="Цена" data-probe="1"></span>',
		)

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.title).toBe('Цена')
		expect(root.dataset.probe).toBe('1')
		expect(fields().map((node) => node.hasAttribute('title'))).toEqual([false, false])
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — образцами', () => {
		const root = document.createElement('span')
		const targets = sliderTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			SliderDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
		expect(Object.values(targets).map((target) => target.mode)).toEqual(['sample', 'sample'])
	})
})

describe('метки', () => {
	it('не заданы — блока меток нет', async () => {
		await mount('<span is="so-slider"></span>')

		expect(document.querySelector('.so-slider__marks')).toBeNull()
	})

	it('подпись — label метки; без подписи — пустой узел, тема прячет его по :empty', async () => {
		await mount('<span is="so-slider" value="20"></span>', {
			marks: [{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }],
		})

		const labels = all('.so-slider__mark-label')

		expect(labels.map((node) => node.textContent)).toEqual(['Мин', '', 'Макс'])
		expect(labels[1].childNodes).toHaveLength(0)
	})

	it('состояния: внутри заливки и под ручкой', async () => {
		await mount('<span is="so-slider" value="20"></span>', {
			marks: [{ value: 0 }, { value: 20 }, { value: 100 }],
		})

		expect(all('.so-slider__mark').map((node) => node.dataset.inRange)).toEqual([
			'true',
			'true',
			'false',
		])
		expect(all('.so-slider__mark').map((node) => node.dataset.current)).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('true — точки шкалы', async () => {
		await mount('<span is="so-slider" step="25" marks></span>')

		expect(all('.so-slider__mark').map(position)).toEqual(['0%', '25%', '50%', '75%', '100%'])
	})

	/**
	 * Подписи меток — зрительная шкала: значение и границы объявляет поле. Что
	 * в подписи `Label` их текст не входит в имя поля, проверяет браузер, здесь
	 * — что блок скрыт.
	 */
	it('блок меток — под aria-hidden, за заливкой и перед ручками', async () => {
		await mount('<span is="so-slider" value="20"></span>', {
			marks: [{ value: 0, label: 'Мин' }],
		})

		const marks = find(document, '.so-slider__marks', HTMLElement)

		expect(marks.getAttribute('aria-hidden')).toBe('true')
		expect(marks.previousElementSibling?.className).toBe('so-slider__range')
		expect(marks.nextElementSibling?.className).toBe('so-slider__thumb')
	})

	it('метки сняли и задали снова — блок за ними, на прежнем месте', async () => {
		const root = await mount('<span is="so-slider" value="20"></span>', {
			marks: [{ value: 50 }],
		})

		root.marks = false
		await flush()

		expect(document.querySelector('.so-slider__marks')).toBeNull()

		root.marks = [{ value: 10 }, { value: 90 }]
		await flush()

		const marks = find(document, '.so-slider__marks', HTMLElement)

		expect(all('.so-slider__mark').map(position)).toEqual(['10%', '90%'])
		expect(marks.previousElementSibling?.className).toBe('so-slider__range')
	})
})

describe('значение сохраняет форму', () => {
	it('число остаётся числом', async () => {
		const root = await mount('<span is="so-slider" value="50"></span>')
		const changes = collect(root, 'so:change:value')

		await press(field(), 'ArrowRight')

		expect(changes.map(newValueOf)).toEqual([51])
		expect(field().value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const root = await mount('<span is="so-slider" value="[20,80]"></span>')
		const changes = collect(root, 'so:change:value')

		await press(field(1), 'ArrowLeft')

		expect(changes.map(newValueOf)).toEqual([[20, 79]])
		expect(field(1).value).toBe('79')
	})

	it('commit — событием элемента, в форме значения', async () => {
		const root = await mount('<span is="so-slider" value="[20,80]"></span>')
		const commits = collect(root, 'so:commit')

		await press(field(0), 'End')

		const expected: TValuePayload<number[]> = { newValue: [80, 80], oldValue: [20, 80] }

		expect(commits).toEqual([expected])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TSlider({ value: 10 })

		await mountCtrl(ctrl)

		ctrl.value = 40
		await flush()

		expect(field().value).toBe('40')
		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('40%')
	})
})

describe('ручки — по месту', () => {
	/**
	 * Выход `thumbs` — новые записи на каждую смену, и петля по ссылке
	 * пересоздавала бы ручки: поле под фокусом пропадало бы с каждым шагом.
	 */
	it('шаг клавишей — те же узлы ручек, фокус остаётся на поле', async () => {
		await mount('<span is="so-slider" value="[20,80]"></span>')

		const thumbs = all('.so-slider__thumb')
		const second = field(1)

		second.focus()
		await press(second, 'ArrowLeft')

		expect(all('.so-slider__thumb')).toEqual(thumbs)
		expect(field(1)).toBe(second)
		expect(document.activeElement).toBe(second)
		expect(second.value).toBe('79')
	})

	it('ручку добавили — прежние остаются теми же узлами', async () => {
		const root = await mount('<span is="so-slider" value="[20,80]"></span>')
		const [first, second] = fields()

		root.value = [20, 50, 90]
		await flush()

		expect(fields()).toHaveLength(3)
		expect(field(0)).toBe(first)
		expect(field(1)).toBe(second)
		expect(fields().map((node) => node.value)).toEqual(['20', '50', '90'])
	})

	/**
	 * Значение поля браузер прижимает к ходу: записанное раньше нового `max`,
	 * оно встало бы на прежний край. Поэтому шаблон пишет значение после хода.
	 */
	it('ход и значение сменились разом — значение поля по новому ходу', async () => {
		const root = await mount('<span is="so-slider" value="50"></span>')

		root.max = 300
		root.value = 250
		await flush()

		expect(field().max).toBe('300')
		expect(field().value).toBe('250')
	})

	it('ход сузили — поле по новому ходу, без лишней записи значения', async () => {
		const ctrl = new TSlider({ value: 50 })

		await mountCtrl(ctrl)

		ctrl.max = 40
		await flush()

		expect(field().max).toBe('40')
		expect(field().value).toBe('40')
	})
})

describe('образцы слотов со scope', () => {
	it('mark — копия в каждую подпись метки, данные — по месту метки', async () => {
		const root = await mount(
			`<span is="so-slider">
				<template slot="mark"><b class="probe">*</b></template>
			</span>`,
			{ marks: [{ value: 0, label: 'Мин' }, { value: 100 }] },
		)
		const probes = all('.probe')

		expect(probes).toHaveLength(2)
		expect(probes.map((node) => node.parentElement?.className)).toEqual([
			'so-slider__mark-label',
			'so-slider__mark-label',
		])
		// Своего текста подпись при образце не пишет
		expect(all('.so-slider__mark-label').map((node) => node.textContent)).toEqual(['*', '*'])

		// Данные копия находит у элемента: номер своей метки среди меток блока
		const marks = all('.so-slider__mark')
		const scope = probes.map((probe) => {
			const mark = probe.closest('.so-slider__mark')

			return mark instanceof HTMLElement ? root.state.shownMarks?.[marks.indexOf(mark)] : null
		})

		expect(scope.map((mark) => [mark?.value, mark?.label])).toEqual([
			[0, 'Мин'],
			[100, undefined],
		])
	})

	it('thumb — копия в подсказку каждой ручки, данные — по месту ручки', async () => {
		const root = await mount(`<span is="so-slider" value="[20,80]" tooltip="always">
			<template slot="thumb"><b class="probe">?</b></template>
		</span>`)
		const probes = all('.probe')

		expect(probes.map((node) => node.parentElement?.className)).toEqual([
			'so-slider__tooltip',
			'so-slider__tooltip',
		])

		const thumbs = all('.so-slider__thumb')
		const values = probes.map((probe) => {
			const thumb = probe.closest('.so-slider__thumb')

			return thumb instanceof HTMLElement
				? root.state.thumbs?.[thumbs.indexOf(thumb)]?.value
				: null
		})

		expect(values).toEqual([20, 80])
	})

	/** Копия одна на всё время жизни узла: шаг клавишей её не пересоздаёт. */
	it('шаг клавишей — своя подсказка thumb тем же узлом', async () => {
		await mount(`<span is="so-slider" value="[20,80]" tooltip="always">
			<template slot="thumb"><b class="probe">?</b></template>
		</span>`)

		const probes = all('.probe')

		await press(field(1), 'ArrowLeft')

		expect(all('.probe')).toEqual(probes)
		expect(field(1).value).toBe('79')
	})

	it('пустой образец — как не заданный: подсказка рисует значение', async () => {
		await mount(`<span is="so-slider" value="30" tooltip="always">
			<template slot="thumb"></template>
		</span>`)

		expect(all('.so-slider__tooltip').map((node) => node.textContent)).toEqual(['30'])
	})

	it('образцы не выводятся: в разметке ползунка нет ни шаблона, ни текста слота', async () => {
		const root = await mount(`<span is="so-slider" value="30">
			<template slot="thumb"><b class="probe">?</b></template>
			<template slot="mark"><i class="mark-probe">!</i></template>
		</span>`)

		expect(root.querySelector('template')).toBeNull()
		expect(document.querySelector('.probe')).toBeNull()
		expect(document.querySelector('.mark-probe')).toBeNull()
	})
})

/**
 * Подсказка со значением — разметка внутри ручки. Рисовать ли её, решает ядро
 * (`tooltipRendered`), когда показывать в `auto` — тема: это и то, что
 * подсказка едет за ручкой, проверяет браузер.
 */
describe('подсказка со значением', () => {
	const tooltips = () => all('.so-slider__tooltip')

	it('без режима подсказки нет, и образец thumb не копируется', async () => {
		const root = await mount(`<span is="so-slider" value="[20,80]">
			<template slot="thumb"><b class="probe">?</b></template>
		</span>`)

		expect(root.classList.contains('so-slider--tooltip-none')).toBe(true)
		expect(tooltips()).toEqual([])
		expect(all('.probe')).toEqual([])
	})

	it('auto — по подсказке на ручку сразу после поля, под aria-hidden', async () => {
		const root = await mount('<span is="so-slider" value="[20,80]" tooltip="auto"></span>')

		expect(root.classList.contains('so-slider--tooltip-auto')).toBe(true)
		expect(tooltips().map((node) => node.localName)).toEqual(['span', 'span'])
		expect(tooltips().map((node) => node.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
		expect(tooltips().map((node) => node.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
	})

	it('текст — значение ручки, без пробелов, и меняется вместе с ним', async () => {
		await mount('<span is="so-slider" value="[20,80]" tooltip="auto"></span>')

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '80'])

		await press(field(1), 'ArrowLeft')

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '79'])
	})

	it('режим с экземпляра: включили — подсказка есть, выключили — нет', async () => {
		const ctrl = new TSlider({ value: 30 })
		const root = await mountCtrl(ctrl)

		expect(tooltips()).toEqual([])

		ctrl.tooltip = 'always'
		await flush()

		expect(root.classList.contains('so-slider--tooltip-always')).toBe(true)
		expect(tooltips().map((node) => node.textContent)).toEqual(['30'])

		const [tooltip] = tooltips()

		ctrl.tooltip = 'none'
		await flush()

		expect(tooltips()).toEqual([])

		// Снова включили — та же подсказка: она остаётся за ручкой
		ctrl.tooltip = 'auto'
		await flush()

		expect(tooltips()).toEqual([tooltip])
	})
})

describe('в подписи Label', () => {
	/**
	 * Подпись — цель клика первого поля: оно её первый labelable-потомок. Имена
	 * нескольких ручек при этом даёт `thumbLabels`, первой тоже (APG,
	 * Multi-Thumb Slider): в подписи значение второго поля вошло бы в имя
	 * первого. Имена в подписи считает браузер.
	 */
	it('подпись связана с первым полем', async () => {
		const host = markup(
			'<label is="so-label" text="Цена"><span is="so-slider" value="[20,80]"></span></label>',
		)

		document.body.appendChild(host)
		await flush()

		const label = host.querySelector('[is="so-label"]')

		if (!isLabel(label)) throw new Error('<label is="so-label"> нет')

		expect(label.control).toBe(field(0))
	})
})
