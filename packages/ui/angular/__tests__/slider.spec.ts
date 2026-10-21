/**
 * Slider под Angular — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ручка на каждое значение, поле с ходом, шагом и
 * именем, позиции переменными, слоты со scope и значение в той форме, в какой
 * его задали. Сценарии — те же, что у Vue (`slider.spec.ts`); `v-model` Vue
 * здесь — вход `value` с выходом `(soChangeValue)`.
 *
 * Своё у Angular — набор корня из другого выхода (`rootAria`, описание корня
 * `aria`), петля ручек и меток по месту (`track $index`): ручка — тот же узел
 * на каждую смену значения, и фокус её поля переживает шаг клавишей, — и
 * значение поля, которое директива текста поля пишет после хода поля. И такт:
 * смену состояния шаблон применяет на проверке изменений.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import type { ComponentFixture } from '@angular/core/testing'
import { TestBed } from '@angular/core/testing'
import {
	TSlider,
	type TComponentSize,
	type TDirection,
	type TSlideOrientation,
	type TSliderMarks,
	type TSliderStep,
	type TSliderTooltip,
	type TSliderValue,
	type TValuePayload,
} from '@soldy-ui/core'
import { SlotDirective, TLabelComponent, TSliderComponent } from '@soldy-ui/angular'
import { find, findIn, mountHost, nextFrame } from './mount'

/** Входы ползунка, которые задают сценарии, кроме значения. */
type TProps = {
	readonly min?: number
	readonly max?: number
	readonly step?: TSliderStep
	readonly name?: string
	readonly orientation?: TSlideOrientation
	readonly minStepsBetweenThumbs?: number
	readonly thumbLabels?: string[]
	readonly aria_label?: string
	readonly disabled?: boolean
	readonly marks?: TSliderMarks
	readonly tooltip?: TSliderTooltip
	readonly direction?: TDirection
	readonly size?: TComponentSize
}

/**
 * Ползунок со значением в сигнале: смена приходит выходом `(soChangeValue)` и
 * возвращается входом — как `v-model` у Vue.
 */
@Component({
	selector: 'probe-slider',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span
		so-slider
		[value]="value()"
		[min]="props().min"
		[max]="props().max"
		[step]="props().step"
		[name]="props().name"
		[orientation]="props().orientation"
		[minStepsBetweenThumbs]="props().minStepsBetweenThumbs"
		[thumbLabels]="props().thumbLabels"
		[aria_label]="props().aria_label"
		[disabled]="props().disabled"
		[marks]="props().marks"
		[tooltip]="props().tooltip"
		[direction]="props().direction"
		[size]="props().size"
		(soChangeValue)="change($event.newValue)"
		(soCommit)="commits.push($event)"
	></span>`,
})
class SliderHost {
	readonly value = signal<TSliderValue | undefined>(undefined)
	readonly props = signal<TProps>({})
	readonly changes: TSliderValue[] = []
	readonly commits: TValuePayload<TSliderValue>[] = []

	change(value: TSliderValue): void {
		this.changes.push(value)
		this.value.set(value)
	}
}

/** Внешний экземпляр — вторая поверхность управления. */
@Component({
	selector: 'probe-slider-ctrl',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span so-slider [ctrl]="ctrl"></span>`,
})
class CtrlHost {
	readonly ctrl = new TSlider({ value: 10 })
}

@Component({
	selector: 'probe-slider-attrs',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span so-slider [value]="[20, 80]" class="mine" title="Цена" data-probe="1"></span>`,
})
class AttrsHost {}

@Component({
	selector: 'probe-slider-slots',
	standalone: true,
	imports: [TSliderComponent, SlotDirective],
	template: `<span so-slider [value]="value()" [marks]="marks" tooltip="always">
		<ng-template slot="mark" let-value="value" let-label="label"
			>{{ label ?? '—' }}:{{ value }}</ng-template
		>
		<ng-template slot="thumb" let-value="value" let-index="index"
			><b class="so-test-thumb">{{ index }}:{{ value }}</b></ng-template
		>
	</span>`,
})
class SlotsHost {
	readonly value = signal<TSliderValue>([20, 80])
	readonly marks: TSliderMarks = [{ value: 0, label: 'Мин' }, { value: 100 }]
}

@Component({
	selector: 'probe-slider-thumb-slot',
	standalone: true,
	imports: [TSliderComponent, SlotDirective],
	template: `<span so-slider [value]="[20, 80]">
		<ng-template slot="thumb" let-value="value"
			><b class="so-test-thumb">{{ value }}</b></ng-template
		>
	</span>`,
})
class ThumbSlotWithoutTooltipHost {}

@Component({
	selector: 'probe-slider-range',
	standalone: true,
	imports: [TSliderComponent],
	template: `<span so-slider [value]="value()" [max]="max()"></span>`,
})
class RangeHost {
	readonly value = signal(50)
	readonly max = signal(100)
}

@Component({
	selector: 'probe-slider-label',
	standalone: true,
	imports: [TSliderComponent, TLabelComponent],
	template: `<label so-label text="Цена"><span so-slider [value]="[20, 80]"></span></label>`,
})
class LabelHost {}

/** Узлы по селектору в разметке фикстуры. */
const all = (fixture: ComponentFixture<unknown>, selector: string): HTMLElement[] => {
	const host: HTMLElement = fixture.nativeElement

	return [...host.querySelectorAll<HTMLElement>(selector)]
}

/** Поля ручек по порядку. */
const fields = (fixture: ComponentFixture<unknown>): HTMLInputElement[] => {
	const host: HTMLElement = fixture.nativeElement

	return [...host.querySelectorAll('.so-slider__input')].filter(
		(node): node is HTMLInputElement => node instanceof HTMLInputElement,
	)
}

/** Поле ручки по номеру; нет его — тест падает здесь. */
function field(fixture: ComponentFixture<unknown>, index = 0): HTMLInputElement {
	const node = fields(fixture)[index]

	if (!node) throw new Error(`поля ${index} нет`)

	return node
}

/** Корень ползунка. */
const root = (fixture: ComponentFixture<unknown>) => findIn(fixture, '[so-slider]', HTMLElement)

const position = (node: HTMLElement) => node.style.getPropertyValue('--so-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Ползунок со значением и входами сценария. Слушатели плагинов встают по
 * `ready` — кадром позже.
 */
async function render(
	initial: TSliderValue,
	props: TProps = {},
): Promise<ComponentFixture<SliderHost>> {
	const fixture = TestBed.createComponent(SliderHost)

	fixture.componentInstance.value.set(initial)
	fixture.componentInstance.props.set(props)
	fixture.detectChanges()
	await nextFrame()

	return fixture
}

/** Смена значения снаружи — новым значением входа. */
function setValue(fixture: ComponentFixture<SliderHost>, value: TSliderValue): void {
	fixture.componentInstance.value.set(value)
	fixture.detectChanges()
}

/** Смена входов сценария. */
function setProps(fixture: ComponentFixture<SliderHost>, props: TProps): void {
	fixture.componentInstance.props.set(props)
	fixture.detectChanges()
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span', async () => {
		const fixture = await render(30, { direction: 'rtl', size: 'lg' })
		const node = root(fixture)

		expect(node.localName).toBe('span')
		expect(node.classList.contains('so-slider--horizontal')).toBe(true)
		expect(node.classList.contains('so-slider--size-lg')).toBe(true)
		expect(node.dataset['dragging']).toBe('false')
		expect(node.dataset['disabled']).toBe('false')
		expect(node.getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полям, не корню
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(
			all(fixture, '.so-slider *').filter(
				(child) => !['span', 'input'].includes(child.localName),
			),
		).toEqual([])
	})

	it('части — прямыми детьми: дорожка у корня, ручки и заливка у дорожки, поле у ручки', async () => {
		const fixture = await render([20, 80])
		const track = find(root(fixture), ':scope > .so-slider__track', HTMLElement)

		expect([...track.children].map((node) => node.className)).toEqual([
			'so-slider__range',
			'so-slider__thumb',
			'so-slider__thumb',
		])
		expect(
			all(fixture, '.so-slider__thumb').map((thumb) => thumb.firstElementChild?.className),
		).toEqual(['so-slider__input', 'so-slider__input'])
	})

	it('число — одна ручка, массив — по ручке на элемент', async () => {
		const fixture = await render(30)

		expect(all(fixture, '.so-slider__thumb')).toHaveLength(1)

		setValue(fixture, [10, 50, 90])

		expect(all(fixture, '.so-slider__thumb')).toHaveLength(3)
		expect(fields(fixture).map((node) => node.value)).toEqual(['10', '50', '90'])
	})

	it('поле ручки: ход, шаг, значение, name, disabled и имя', async () => {
		const fixture = await render([20, 60], {
			// Зазор — в шагах шкалы: один шаг по 5
			minStepsBetweenThumbs: 1,
			step: 5,
			name: 'price',
			orientation: 'vertical',
			thumbLabels: ['От', 'До'],
			aria_label: 'Цена',
		})

		const [first, second] = fields(fixture)

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
		expect(root(fixture).getAttribute('aria-label')).toBe('Цена')
		expect(root(fixture).hasAttribute('aria-orientation')).toBe(false)
		expect(first.hasAttribute('aria-disabled')).toBe(false)
	})

	it('одна ручка: aria_label называет её поле, корень — без роли и имени', async () => {
		const fixture = await render(30, { aria_label: 'Громкость' })

		expect(field(fixture).getAttribute('aria-label')).toBe('Громкость')
		expect(root(fixture).hasAttribute('role')).toBe(false)
		expect(root(fixture).hasAttribute('aria-label')).toBe(false)
	})

	it('несколько ручек: корень — группа с aria_label, у полей его нет; выключенный — нативный disabled', async () => {
		const fixture = await render([20, 60], { aria_label: 'Цена', disabled: true })

		expect(root(fixture).getAttribute('role')).toBe('group')
		expect(root(fixture).getAttribute('aria-label')).toBe('Цена')
		expect(fields(fixture).map((node) => node.hasAttribute('aria-label'))).toEqual([
			false,
			false,
		])
		expect(fields(fixture).every((node) => node.disabled)).toBe(true)
		expect(root(fixture).dataset['disabled']).toBe('true')
	})

	it('число ручек сменилось — набор корня и полей за ним', async () => {
		const fixture = await render(30, { aria_label: 'Цена' })

		setValue(fixture, [20, 80])

		expect(root(fixture).getAttribute('role')).toBe('group')
		expect(root(fixture).getAttribute('aria-label')).toBe('Цена')
		expect(fields(fixture).map((node) => node.hasAttribute('aria-label'))).toEqual([
			false,
			false,
		])

		setValue(fixture, 50)

		expect(root(fixture).hasAttribute('role')).toBe(false)
		expect(root(fixture).hasAttribute('aria-label')).toBe(false)
		expect(field(fixture).getAttribute('aria-label')).toBe('Цена')
	})

	it('у шага списком поле без шага: step="any"', async () => {
		const fixture = await render(5, { step: [1, 5, 10] })

		expect(field(fixture).step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', async () => {
		const fixture = await render([20, 70], { marks: [{ value: 50 }] })
		const range = findIn(fixture, '.so-slider__range', HTMLElement)

		expect(position(findIn(fixture, '.so-slider__thumb', HTMLElement))).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-start')).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-end')).toBe('70%')
		expect(position(findIn(fixture, '.so-slider__mark', HTMLElement))).toBe('50%')
	})

	it('атрибуты потребителя — корню: полей столько, сколько ручек', () => {
		const fixture = mountHost(AttrsHost)

		expect(root(fixture).classList.contains('mine')).toBe(true)
		expect(root(fixture).classList.contains('so-slider')).toBe(true)
		expect(root(fixture).title).toBe('Цена')
		expect(root(fixture).dataset['probe']).toBe('1')
		expect(fields(fixture).map((node) => node.hasAttribute('title'))).toEqual([false, false])
	})
})

describe('метки', () => {
	it('не заданы — контейнера меток нет', async () => {
		const fixture = await render(30)

		expect(all(fixture, '.so-slider__marks')).toEqual([])
	})

	/**
	 * Пустую подпись тема прячет по `:empty`: в ней нет ни узла, ни символа, и
	 * метка остаётся одной точкой.
	 */
	it('подпись — label метки; без подписи — пустой узел', async () => {
		const fixture = await render(20, {
			marks: [{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }],
		})

		const labels = all(fixture, '.so-slider__mark-label')

		expect(labels.map((node) => node.textContent)).toEqual(['Мин', '', 'Макс'])
		expect(labels[1].childNodes).toHaveLength(0)
	})

	it('состояния: внутри заливки и под ручкой', async () => {
		const fixture = await render(20, { marks: [{ value: 0 }, { value: 20 }, { value: 100 }] })

		expect(all(fixture, '.so-slider__mark').map((node) => node.dataset['inRange'])).toEqual([
			'true',
			'true',
			'false',
		])
		expect(all(fixture, '.so-slider__mark').map((node) => node.dataset['current'])).toEqual([
			'false',
			'true',
			'false',
		])
	})

	it('true — точки шкалы', async () => {
		const fixture = await render(0, { step: 25, marks: true })

		expect(all(fixture, '.so-slider__mark').map(position)).toEqual([
			'0%',
			'25%',
			'50%',
			'75%',
			'100%',
		])
	})

	/**
	 * Подписи меток — зрительная шкала: значение и границы объявляет поле. Что
	 * в подписи `Label` их текст не входит в имя поля, проверяет браузер
	 * (`playground/vue/browser/slider.spec.ts`), здесь — что блок скрыт.
	 */
	it('блок меток — под aria-hidden', async () => {
		const fixture = await render(20, { marks: [{ value: 0, label: 'Мин' }, { value: 100 }] })

		expect(findIn(fixture, '.so-slider__marks', HTMLElement).getAttribute('aria-hidden')).toBe(
			'true',
		)
	})

	it('метки сняли и задали снова — контейнер за ними', async () => {
		const fixture = await render(20, { marks: false })

		setProps(fixture, { marks: [{ value: 50 }] })

		expect(all(fixture, '.so-slider__mark')).toHaveLength(1)

		setProps(fixture, { marks: false })

		expect(all(fixture, '.so-slider__marks')).toEqual([])
	})
})

describe('значение сохраняет форму', () => {
	it('число остаётся числом', async () => {
		const fixture = await render(50)

		press(field(fixture), 'ArrowRight')
		fixture.detectChanges()

		expect(fixture.componentInstance.changes).toEqual([51])
		expect(field(fixture).value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const fixture = await render([20, 80])

		press(field(fixture, 1), 'ArrowLeft')
		fixture.detectChanges()

		expect(fixture.componentInstance.changes).toEqual([[20, 79]])
		expect(field(fixture, 1).value).toBe('79')
	})

	it('commit — выходом компонента, в форме значения', async () => {
		const fixture = await render([20, 80])

		press(field(fixture, 0), 'End')
		fixture.detectChanges()

		expect(fixture.componentInstance.commits).toEqual([
			{ newValue: [80, 80], oldValue: [20, 80] },
		])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const fixture = mountHost(CtrlHost)

		await nextFrame()

		fixture.componentInstance.ctrl.value = 40
		fixture.detectChanges()

		expect(field(fixture).value).toBe('40')
		expect(position(findIn(fixture, '.so-slider__thumb', HTMLElement))).toBe('40%')
	})
})

describe('ручки — по месту', () => {
	/**
	 * Выход `thumbs` — новые записи на каждую смену, и петля по ссылке
	 * пересоздавала бы ручки: поле под фокусом пропадало бы с каждым шагом.
	 */
	it('шаг клавишей — те же узлы ручек, фокус остаётся на поле', async () => {
		const fixture = await render([20, 80])

		const thumbs = all(fixture, '.so-slider__thumb')
		const second = field(fixture, 1)

		second.focus()
		press(second, 'ArrowLeft')
		fixture.detectChanges()

		expect(all(fixture, '.so-slider__thumb')).toEqual(thumbs)
		expect(field(fixture, 1)).toBe(second)
		expect(document.activeElement).toBe(second)
		expect(second.value).toBe('79')
	})

	it('ручку добавили — прежние остаются теми же узлами', async () => {
		const fixture = await render([20, 80])

		const [first, second] = fields(fixture)

		setValue(fixture, [20, 50, 90])

		expect(fields(fixture)).toHaveLength(3)
		expect(field(fixture, 0)).toBe(first)
		expect(field(fixture, 1)).toBe(second)
		expect(fields(fixture).map((node) => node.value)).toEqual(['20', '50', '90'])
	})

	/**
	 * Значение поля браузер прижимает к ходу: записанное раньше нового `max`,
	 * оно встало бы на прежний край. Поэтому значение пишет директива текста
	 * поля — после хода.
	 */
	it('ход и значение сменились разом — значение поля по новому ходу', async () => {
		const fixture = mountHost(RangeHost)

		await nextFrame()

		fixture.componentInstance.max.set(300)
		fixture.componentInstance.value.set(250)
		fixture.detectChanges()

		expect(field(fixture).max).toBe('300')
		expect(field(fixture).value).toBe('250')
	})
})

describe('слоты со scope', () => {
	it('mark получает значение и подпись метки', () => {
		const fixture = mountHost(SlotsHost)

		expect(all(fixture, '.so-slider__mark-label').map((node) => node.textContent)).toEqual([
			'Мин:0',
			'—:100',
		])
	})

	it('thumb — содержимое подсказки, со значением и номером ручки', () => {
		const fixture = mountHost(SlotsHost)
		const probes = all(fixture, '.so-test-thumb')

		expect(probes.map((node) => node.textContent)).toEqual(['0:20', '1:80'])
		expect(probes.map((node) => node.parentElement?.className)).toEqual([
			'so-slider__tooltip',
			'so-slider__tooltip',
		])
	})

	/**
	 * Шаблон слота получает новый scope на месте: вывод шаблона
	 * (`ngTemplateOutlet`) пересоздаёт представление только с новым шаблоном, и
	 * своя подсказка не пересоздаётся на каждый шаг.
	 */
	it('новое значение — своя подсказка thumb тем же узлом, с новым значением', () => {
		const fixture = mountHost(SlotsHost)
		const probes = all(fixture, '.so-test-thumb')

		fixture.componentInstance.value.set([20, 79])
		fixture.detectChanges()

		expect(all(fixture, '.so-test-thumb')).toEqual(probes)
		expect(probes.map((node) => node.textContent)).toEqual(['0:20', '1:79'])
	})
})

/**
 * Подсказка со значением — разметка внутри ручки. Рисовать ли её, решает ядро
 * (`tooltipRendered`), когда показывать в `auto` — тема: это и то, что
 * подсказка едет за ручкой, проверяет браузер
 * (`playground/vue/browser/slider.spec.ts`).
 */
describe('подсказка со значением', () => {
	const tooltips = (fixture: ComponentFixture<unknown>) => all(fixture, '.so-slider__tooltip')

	it('без режима подсказки нет, и шаблон thumb не рисуется', () => {
		const fixture = mountHost(ThumbSlotWithoutTooltipHost)

		expect(root(fixture).classList.contains('so-slider--tooltip-none')).toBe(true)
		expect(tooltips(fixture)).toEqual([])
		expect(all(fixture, '.so-test-thumb')).toEqual([])
	})

	it('auto — по подсказке на ручку сразу после поля, под aria-hidden', async () => {
		const fixture = await render([20, 80], { tooltip: 'auto' })

		expect(root(fixture).classList.contains('so-slider--tooltip-auto')).toBe(true)
		expect(tooltips(fixture).map((node) => node.localName)).toEqual(['span', 'span'])
		expect(tooltips(fixture).map((node) => node.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
		expect(tooltips(fixture).map((node) => node.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
	})

	it('текст — значение ручки, без пробелов, и меняется вместе с ним', async () => {
		const fixture = await render([20, 80], { tooltip: 'auto' })

		expect(tooltips(fixture).map((node) => node.textContent)).toEqual(['20', '80'])

		press(field(fixture, 1), 'ArrowLeft')
		fixture.detectChanges()

		expect(tooltips(fixture).map((node) => node.textContent)).toEqual(['20', '79'])
	})

	it('режим с экземпляра: включили — подсказка есть, выключили — нет', () => {
		const fixture = mountHost(CtrlHost)
		const { ctrl } = fixture.componentInstance

		ctrl.value = 30
		fixture.detectChanges()

		expect(tooltips(fixture)).toEqual([])

		ctrl.tooltip = 'always'
		fixture.detectChanges()

		expect(root(fixture).classList.contains('so-slider--tooltip-always')).toBe(true)
		expect(tooltips(fixture).map((node) => node.textContent)).toEqual(['30'])

		ctrl.tooltip = 'none'
		fixture.detectChanges()

		expect(tooltips(fixture)).toEqual([])
	})

	it('режим из разметки сменился — подсказки за ним', async () => {
		const fixture = await render([20, 80], { tooltip: 'none' })

		setProps(fixture, { tooltip: 'always' })

		expect(tooltips(fixture)).toHaveLength(2)

		setProps(fixture, { tooltip: 'none' })

		expect(tooltips(fixture)).toEqual([])
	})
})

describe('в подписи Label', () => {
	/**
	 * Подпись — цель клика первого поля: оно её первый labelable-потомок. Имена
	 * нескольких ручек при этом даёт `thumbLabels`, первой тоже (APG,
	 * Multi-Thumb Slider): в подписи значение второго поля вошло бы в имя
	 * первого. Имена в подписи считает браузер — `describe('имена ручек')` в
	 * `playground/vue/browser/slider.spec.ts`.
	 */
	it('подпись связана с первым полем', () => {
		const fixture = mountHost(LabelHost)

		expect(findIn(fixture, 'label', HTMLLabelElement).control).toBe(field(fixture))
	})
})
