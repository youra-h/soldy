/**
 * Slider в React — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ручка на каждое значение, поле с ходом, шагом и
 * именем, позиции переменными, слоты со scope и управляемое значение в той
 * форме, в какой его задали. Сценарии — те же, что у Vue (`slider.spec.ts`).
 *
 * Своё у React — поля. Значение каждого `<input type="range">` ведёт ядро
 * (`NativeInput`): контролируемое поле React без `onChange` сочло бы ошибкой,
 * и сторож консоли уронил бы тест.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode, act, useState } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TSlider } from '@soldy-ui/core'
import type { TSliderValue, TValuePayload } from '@soldy-ui/core'
import { Label, Slider, type SliderProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/**
 * Ползунок, чьё значение возвращается пропом, — как `v-model` у Vue:
 * значение держит состояние родителя, а смена приходит `onChangeValue`.
 */
function Controlled(props: SliderProps) {
	const [value, setValue] = useState(props.value)

	return (
		<Slider
			{...props}
			value={value}
			onChangeValue={(payload) => {
				setValue(payload.newValue)
				props.onChangeValue?.(payload)
			}}
		/>
	)
}

/** Ползунок в документе с управляемым значением; плагины встают кадром. */
async function render(props: SliderProps = {}): Promise<{ rerender: (next: SliderProps) => void }> {
	const view = mount(<Controlled {...props} />)

	await nextFrame()

	return { rerender: (next) => view.render(<Controlled {...next} />) }
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const root = () => find(document, '.so-slider', HTMLElement)
const fields = () =>
	all('.so-slider__input').filter(
		(node): node is HTMLInputElement => node instanceof HTMLInputElement,
	)

function field(index = 0): HTMLInputElement {
	const node = fields()[index]

	if (!node) throw new Error(`поля ${index} нет`)

	return node
}

const position = (node: HTMLElement) => node.style.getPropertyValue('--so-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(target: HTMLElement, key: string): void {
	act(() => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	})
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span', async () => {
		await render({ direction: 'rtl', size: 'lg' })

		expect(root().localName).toBe('span')
		expect(root().classList.contains('so-slider--horizontal')).toBe(true)
		expect(root().classList.contains('so-slider--size-lg')).toBe(true)
		expect(root().dataset.dragging).toBe('false')
		expect(root().dataset.disabled).toBe('false')
		expect(root().getAttribute('dir')).toBe('rtl')
		// Набор ARIA — полям, не корню
		expect(root().hasAttribute('aria-orientation')).toBe(false)
		expect(
			all('.so-slider *').filter((node) => !['span', 'input'].includes(node.localName)),
		).toEqual([])
	})

	it('число — одна ручка, массив — по ручке на элемент', () => {
		const { render: rerender } = mount(<Slider value={30} />)

		expect(all('.so-slider__thumb')).toHaveLength(1)

		rerender(<Slider value={[10, 50, 90]} />)

		expect(all('.so-slider__thumb')).toHaveLength(3)
		expect(fields().map((node) => node.value)).toEqual(['10', '50', '90'])
	})

	it('поле ручки: ход, шаг, значение, name, disabled и имя', async () => {
		await render({
			value: [20, 60],
			// Зазор — в шагах шкалы: один шаг по 5
			minStepsBetweenThumbs: 1,
			step: 5,
			name: 'price',
			orientation: 'vertical',
			thumbLabels: ['От', 'До'],
			aria_label: 'Цена',
		})

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
		expect(root().getAttribute('aria-label')).toBe('Цена')
		expect(root().hasAttribute('aria-orientation')).toBe(false)
		expect(first.hasAttribute('aria-disabled')).toBe(false)
	})

	it('одна ручка: aria_label называет её поле, корень — без роли и имени', async () => {
		await render({ value: 30, aria_label: 'Громкость' })

		expect(field().getAttribute('aria-label')).toBe('Громкость')
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
	})

	it('несколько ручек: корень — группа с aria_label, у полей его нет; выключенный — нативный disabled', async () => {
		await render({ value: [20, 60], aria_label: 'Цена', disabled: true })

		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])
		expect(fields().every((node) => node.disabled)).toBe(true)
		expect(root().dataset.disabled).toBe('true')
	})

	it('число ручек сменилось — набор корня и полей за ним', () => {
		const { render: rerender } = mount(<Slider value={30} aria_label="Цена" />)

		rerender(<Slider value={[20, 80]} aria_label="Цена" />)

		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])

		rerender(<Slider value={50} aria_label="Цена" />)

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(field().getAttribute('aria-label')).toBe('Цена')
	})

	it('у шага списком поле без шага: step="any"', () => {
		mount(<Slider value={5} step={[1, 5, 10]} />)

		expect(field().step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', () => {
		mount(<Slider value={[20, 70]} marks={[{ value: 50 }]} />)

		const range = find(document, '.so-slider__range', HTMLElement)

		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-start')).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-end')).toBe('70%')
		expect(position(find(document, '.so-slider__mark', HTMLElement))).toBe('50%')
	})

	it('атрибуты потребителя — корню, а не полям', () => {
		mount(<Slider value={[20, 80]} className="mine" title="Подсказка" data-probe="1" />)

		expect(root().classList.contains('mine')).toBe(true)
		expect(root().title).toBe('Подсказка')
		expect(root().dataset.probe).toBe('1')
		expect(fields().some((node) => node.hasAttribute('title'))).toBe(false)
	})
})

describe('метки', () => {
	it('не заданы — контейнера меток нет', () => {
		mount(<Slider />)

		expect(document.querySelector('.so-slider__marks')).toBeNull()
	})

	it('подпись — label метки; без подписи — пустой узел, тема прячет его по :empty', () => {
		mount(
			<Slider
				value={20}
				marks={[{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }]}
			/>,
		)

		const labels = all('.so-slider__mark-label')

		expect(labels.map((node) => node.textContent)).toEqual(['Мин', '', 'Макс'])
		// Ни элемента, ни текстового узла: `:empty` сработает и в браузере
		expect(labels[1].childNodes).toHaveLength(0)
	})

	it('состояния: внутри заливки и под ручкой', () => {
		mount(<Slider value={20} marks={[{ value: 0 }, { value: 20 }, { value: 100 }]} />)

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

	it('true — точки шкалы', () => {
		mount(<Slider step={25} marks />)

		expect(all('.so-slider__mark').map(position)).toEqual(['0%', '25%', '50%', '75%', '100%'])
	})

	/**
	 * Подписи меток — зрительная шкала: значение и границы объявляет поле. Что
	 * в подписи `Label` их текст не входит в имя поля, проверяет браузер
	 * (`playground/vue/browser/slider.spec.ts`), здесь — что блок скрыт.
	 */
	it('блок меток — под aria-hidden', () => {
		mount(<Slider value={20} marks={[{ value: 0, label: 'Мин' }, { value: 100 }]} />)

		expect(find(document, '.so-slider__marks', HTMLElement).getAttribute('aria-hidden')).toBe(
			'true',
		)
	})
})

describe('управляемое значение сохраняет форму', () => {
	it('число остаётся числом', async () => {
		const onChangeValue = vi.fn<(payload: TValuePayload<TSliderValue>) => void>()

		await render({ value: 50, onChangeValue })

		press(field(), 'ArrowRight')

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 51, oldValue: 50 }]])
		expect(field().value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const onChangeValue = vi.fn<(payload: TValuePayload<TSliderValue>) => void>()

		await render({ value: [20, 80], onChangeValue })

		press(field(1), 'ArrowLeft')

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: [20, 79], oldValue: [20, 80] }]])
		expect(field(1).value).toBe('79')
	})

	it('commit — событием компонента, в форме значения', async () => {
		const onCommit = vi.fn()

		await render({ value: [20, 80], onCommit })

		press(field(0), 'End')

		expect(onCommit.mock.calls).toEqual([[{ newValue: [80, 80], oldValue: [20, 80] }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TSlider({ value: 10 })

		mount(<Slider ctrl={ctrl} />)
		await nextFrame()

		act(() => {
			ctrl.value = 40
		})

		expect(field().value).toBe('40')
		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('40%')
	})

	/**
	 * Жест скринридера двигает поле само, событием `input`. Плагин переводит
	 * направление в шаг ядра и возвращает полю значение ядра — и когда шаг
	 * сделан, и когда ядро запись отменило: поле показывает то, что решило
	 * ядро, а не то, куда его сдвинул жест. Без смены значения React поле не
	 * перерисовывает, и вернуть его некому, кроме плагина.
	 */
	it('жест скринридера — шаг ядра; ядро отказало — поле возвращается', async () => {
		const ctrl = new TSlider({ value: 20 })

		mount(<Slider ctrl={ctrl} />)
		await nextFrame()

		const swipe = (value: string) =>
			act(() => {
				field().value = value
				field().dispatchEvent(new Event('input', { bubbles: true }))
			})

		swipe('30')

		// Шаг ядра — один, а не туда, куда сдвинул жест
		expect(ctrl.value).toBe(21)
		expect(field().value).toBe('21')

		ctrl.events.on('change:value:before', (event) => event.preventDefault())
		swipe('40')

		expect(ctrl.value).toBe(21)
		expect(field().value).toBe('21')
	})
})

describe('слоты со scope', () => {
	it('mark получает значение и подпись метки', () => {
		mount(
			<Slider
				marks={[{ value: 0, label: 'Мин' }, { value: 100 }]}
				mark={({ value, label }) => `${label ?? '—'}:${value}`}
			/>,
		)

		expect(all('.so-slider__mark-label').map((node) => node.textContent)).toEqual([
			'Мин:0',
			'—:100',
		])
	})

	it('thumb — содержимое подсказки, со значением и номером ручки', () => {
		mount(
			<Slider
				value={[20, 80]}
				tooltip="always"
				thumb={({ value, index }) => (
					<b className="so-test-thumb">
						{index}:{value}
					</b>
				)}
			/>,
		)

		const probes = all('.so-test-thumb')

		expect(probes.map((node) => node.textContent)).toEqual(['0:20', '1:80'])
		expect(probes.map((node) => node.parentElement?.className)).toEqual([
			'so-slider__tooltip',
			'so-slider__tooltip',
		])
	})
})

/**
 * Подсказка со значением — разметка внутри ручки. Рисовать ли её, решает ядро
 * (`tooltipRendered`), когда показывать в `auto` — тема: это и то, что
 * подсказка едет за ручкой, проверяет браузер
 * (`playground/vue/browser/slider.spec.ts`).
 */
describe('подсказка со значением', () => {
	const tooltips = () => all('.so-slider__tooltip')

	it('без режима подсказки нет, и слот thumb не рисуется', () => {
		mount(<Slider value={[20, 80]} thumb={() => <b className="so-test-thumb">?</b>} />)

		expect(root().classList.contains('so-slider--tooltip-none')).toBe(true)
		expect(tooltips()).toEqual([])
		expect(all('.so-test-thumb')).toEqual([])
	})

	it('auto — по подсказке на ручку сразу после поля, под aria-hidden', async () => {
		await render({ value: [20, 80], tooltip: 'auto' })

		expect(root().classList.contains('so-slider--tooltip-auto')).toBe(true)
		expect(tooltips().map((node) => node.localName)).toEqual(['span', 'span'])
		expect(tooltips().map((node) => node.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
		expect(tooltips().map((node) => node.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
	})

	it('текст — значение ручки, без пробелов, и меняется вместе с ним', async () => {
		await render({ value: [20, 80], tooltip: 'auto' })

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '80'])

		press(field(1), 'ArrowLeft')

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '79'])
	})

	it('режим с экземпляра: включили — подсказка есть, выключили — нет', async () => {
		const ctrl = new TSlider({ value: 30 })

		mount(<Slider ctrl={ctrl} />)
		await nextFrame()

		expect(tooltips()).toEqual([])

		act(() => {
			ctrl.tooltip = 'always'
		})

		expect(root().classList.contains('so-slider--tooltip-always')).toBe(true)
		expect(tooltips().map((node) => node.textContent)).toEqual(['30'])

		act(() => {
			ctrl.tooltip = 'none'
		})

		expect(tooltips()).toEqual([])
	})
})

describe('указатель', () => {
	/** Дорожка — 200 px от 100 до 300. jsdom её не меряет. */
	function measure(): void {
		vi.spyOn(
			find(document, '.so-slider__track', HTMLElement),
			'getBoundingClientRect',
		).mockReturnValue(new DOMRect(100, 100, 200, 20))
	}

	function pointer(target: HTMLElement, type: string, x: number): void {
		act(() => {
			target.dispatchEvent(
				new PointerEvent(type, {
					bubbles: true,
					cancelable: true,
					clientX: x,
					clientY: 110,
					pointerId: 1,
					pointerType: 'mouse',
					button: 0,
				}),
			)
		})
	}

	it('нажатие мимо ручки ставит её туда, протяжка — data-dragging, отпускание — commit', async () => {
		const onCommit = vi.fn()

		await render({ value: 20, onCommit })

		measure()
		pointer(root(), 'pointerdown', 200)

		expect(field().value).toBe('50')

		pointer(root(), 'pointermove', 250)

		expect(root().dataset.dragging).toBe('true')
		expect(field().value).toBe('75')
		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('75%')

		pointer(root(), 'pointerup', 250)

		expect(root().dataset.dragging).toBe('false')
		expect(onCommit.mock.calls).toEqual([[{ newValue: 75, oldValue: 20 }]])
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
		mount(
			<Label text="Цена">
				<Slider value={[20, 80]} />
			</Label>,
		)

		expect(find(document, 'label', HTMLLabelElement).control).toBe(field(0))
	})
})

/**
 * StrictMode пересобирает контекст ползунка: у нового набора свои плагины, и
 * клавиатура обязана встать на тот же корень — по `ready` нового набора.
 */
describe('StrictMode', () => {
	it('пересобранный ползунок: поле по значению, клавиша — шаг', async () => {
		const onChangeValue = vi.fn<(payload: TValuePayload<TSliderValue>) => void>()

		mount(
			<StrictMode>
				<Controlled value={[20, 80]} onChangeValue={onChangeValue} />
			</StrictMode>,
		)
		await nextFrame()

		expect(fields().map((node) => node.value)).toEqual(['20', '80'])

		press(field(1), 'ArrowLeft')

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: [20, 79], oldValue: [20, 80] }]])
		expect(field(1).value).toBe('79')
	})
})

/**
 * Сервер рисует ручки, поля и позиции: значение поля — атрибутом (`value`),
 * позиции — переменными в стиле. Гидратация идёт без расхождений: о
 * разошедшемся атрибуте React сообщил бы в консоль, и сторож консоли уронил
 * бы тест.
 */
describe('серверный рендер', () => {
	const app = (
		<Slider value={[20, 70]} marks={[{ value: 50, label: 'Середина' }]} tooltip="always" />
	)

	it('ручки, поля, позиции и метки — уже в разметке сервера', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(app)

		const inputs = [...container.querySelectorAll('.so-slider__input')]
		const thumb = find(container, '.so-slider__thumb', HTMLElement)

		expect(inputs.map((node) => node.getAttribute('value'))).toEqual(['20', '70'])
		expect(position(thumb)).toBe('20%')
		expect(find(container, '.so-slider__mark-label', HTMLElement).textContent).toBe('Середина')
		expect(
			[...container.querySelectorAll('.so-slider__tooltip')].map((node) => node.textContent),
		).toEqual(['20', '70'])
	})

	it('гидратация — без расхождений, клавиша после неё — шаг', async () => {
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(app)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, app, { onRecoverableError }))
		})
		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()

		press(field(0), 'ArrowRight')

		expect(field(0).value).toBe('21')
	})
})
