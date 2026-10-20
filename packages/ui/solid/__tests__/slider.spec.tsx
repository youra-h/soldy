/**
 * Slider в Solid — проводка целиком, на настоящей разметке.
 *
 * Жест и клавиши считают ядро и плагины (`core/__tests__/slider.spec.ts`,
 * `plugins/__tests__/slide-*.plugin.spec.ts`), раскладку и настоящий ввод —
 * браузер (`playground/vue/browser/slider.spec.ts`). Здесь важно, что они
 * сходятся в разметке: ручка на каждое значение, поле с ходом, шагом и
 * именем, позиции переменными, слоты со scope и значение в той форме, в какой
 * его задали. Сценарии — те же, что у Vue (`slider.spec.ts`); `v-model` Vue
 * здесь — `value` с `onChangeValue`.
 *
 * Своё у Solid — петля ручек и меток по месту (`Index`): ручка — тот же узел
 * на каждую смену значения, и фокус её поля переживает шаг клавишей, — и
 * значение поля, которое `ref` пишет после хода поля (`fieldText`).
 */

import { describe, it, expect, vi } from 'vitest'
import { batch, createSignal } from 'solid-js'
import { TSlider, type TSliderMarks, type TSliderTooltip, type TSliderValue } from '@soldy-ui/core'
import { Label, Slider, type SliderProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Все узлы по селектору в документе. */
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

/** Поля ручек по порядку. */
const fields = () =>
	[...document.querySelectorAll('.so-slider__input')].filter(
		(node): node is HTMLInputElement => node instanceof HTMLInputElement,
	)

/** Поле ручки по номеру; нет его — тест падает здесь. */
function field(index = 0): HTMLInputElement {
	const node = fields()[index]

	if (!node) throw new Error(`поля ${index} нет`)

	return node
}

/** Корень ползунка в документе. */
const root = () => find(document, '.so-slider', HTMLElement)

const position = (node: HTMLElement) => node.style.getPropertyValue('--so-slider-position')

/** Клавиша на поле, как у пользователя: всплывает до корня. */
function press(target: HTMLElement, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Ползунок в документе со значением в сигнале: смена приходит колбэком
 * `onChangeValue` и возвращается пропом — как `v-model` у Vue. Слушатели
 * плагинов встают по `ready` — кадром позже.
 */
async function render(initial: TSliderValue, props: SliderProps = {}) {
	const [value, setValue] = createSignal<TSliderValue>(initial)
	const changes: TSliderValue[] = []

	mount(() => (
		<Slider
			{...props}
			value={value()}
			onChangeValue={({ newValue }) => {
				changes.push(newValue)
				setValue(newValue)
			}}
		/>
	))
	await nextFrame()

	return { value, setValue, changes }
}

describe('разметка', () => {
	it('корень — span с классами, состояниями и направлением; всё внутри — span', async () => {
		await render(30, { direction: 'rtl', size: 'lg' })

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

	it('части — прямыми детьми: дорожка у корня, ручки и заливка у дорожки, поле у ручки', async () => {
		await render([20, 80])

		const track = find(root(), ':scope > .so-slider__track', HTMLElement)

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
		const { setValue } = await render(30)

		expect(all('.so-slider__thumb')).toHaveLength(1)

		setValue([10, 50, 90])

		expect(all('.so-slider__thumb')).toHaveLength(3)
		expect(fields().map((node) => node.value)).toEqual(['10', '50', '90'])
	})

	it('поле ручки: ход, шаг, значение, name, disabled и имя', async () => {
		await render([20, 60], {
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
		await render(30, { aria_label: 'Громкость' })

		expect(field().getAttribute('aria-label')).toBe('Громкость')
		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
	})

	it('несколько ручек: корень — группа с aria_label, у полей его нет; выключенный — нативный disabled', async () => {
		await render([20, 60], { aria_label: 'Цена', disabled: true })

		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])
		expect(fields().every((node) => node.disabled)).toBe(true)
		expect(root().dataset.disabled).toBe('true')
	})

	it('число ручек сменилось — набор корня и полей за ним', async () => {
		const { setValue } = await render(30, { aria_label: 'Цена' })

		setValue([20, 80])

		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Цена')
		expect(fields().map((node) => node.hasAttribute('aria-label'))).toEqual([false, false])

		setValue(50)

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(field().getAttribute('aria-label')).toBe('Цена')
	})

	it('у шага списком поле без шага: step="any"', async () => {
		await render(5, { step: [1, 5, 10] })

		expect(field().step).toBe('any')
	})

	it('позиции — CSS-переменными: ручка, заливка, метки', async () => {
		await render([20, 70], { marks: [{ value: 50 }] })

		const range = find(document, '.so-slider__range', HTMLElement)

		expect(position(find(document, '.so-slider__thumb', HTMLElement))).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-start')).toBe('20%')
		expect(range.style.getPropertyValue('--so-slider-range-end')).toBe('70%')
		expect(position(find(document, '.so-slider__mark', HTMLElement))).toBe('50%')
	})

	it('атрибуты потребителя — корню: полей столько, сколько ручек', () => {
		mount(() => <Slider value={[20, 80]} class="mine" title="Цена" data-probe="1" />)

		expect([...root().classList].at(-1)).toBe('mine')
		expect(root().title).toBe('Цена')
		expect(root().dataset.probe).toBe('1')
		expect(fields().map((node) => node.hasAttribute('title'))).toEqual([false, false])
	})
})

describe('метки', () => {
	it('не заданы — контейнера меток нет', async () => {
		await render(30)

		expect(document.querySelector('.so-slider__marks')).toBeNull()
	})

	/**
	 * Пустую подпись тема прячет по `:empty`: в ней нет ни узла, ни символа, и
	 * метка остаётся одной точкой.
	 */
	it('подпись — label метки; без подписи — пустой узел', async () => {
		await render(20, {
			marks: [{ value: 0, label: 'Мин' }, { value: 20 }, { value: 100, label: 'Макс' }],
		})

		const labels = all('.so-slider__mark-label')

		expect(labels.map((node) => node.textContent)).toEqual(['Мин', '', 'Макс'])
		expect(labels[1].childNodes).toHaveLength(0)
	})

	it('состояния: внутри заливки и под ручкой', async () => {
		await render(20, { marks: [{ value: 0 }, { value: 20 }, { value: 100 }] })

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
		await render(0, { step: 25, marks: true })

		expect(all('.so-slider__mark').map(position)).toEqual(['0%', '25%', '50%', '75%', '100%'])
	})

	/**
	 * Подписи меток — зрительная шкала: значение и границы объявляет поле. Что
	 * в подписи `Label` их текст не входит в имя поля, проверяет браузер
	 * (`playground/vue/browser/slider.spec.ts`), здесь — что блок скрыт.
	 */
	it('блок меток — под aria-hidden', async () => {
		await render(20, { marks: [{ value: 0, label: 'Мин' }, { value: 100 }] })

		expect(find(document, '.so-slider__marks', HTMLElement).getAttribute('aria-hidden')).toBe(
			'true',
		)
	})

	it('метки сняли и задали снова — контейнер за ними', () => {
		const [marks, setMarks] = createSignal<TSliderMarks>(false)

		mount(() => <Slider value={20} marks={marks()} />)

		setMarks([{ value: 50 }])

		expect(all('.so-slider__mark')).toHaveLength(1)

		setMarks(false)

		expect(document.querySelector('.so-slider__marks')).toBeNull()
	})
})

describe('значение сохраняет форму', () => {
	it('число остаётся числом', async () => {
		const { changes } = await render(50)

		press(field(), 'ArrowRight')

		expect(changes).toEqual([51])
		expect(field().value).toBe('51')
	})

	it('массив остаётся массивом', async () => {
		const { changes } = await render([20, 80])

		press(field(1), 'ArrowLeft')

		expect(changes).toEqual([[20, 79]])
		expect(field(1).value).toBe('79')
	})

	it('commit — колбэком компонента, в форме значения', async () => {
		const onCommit = vi.fn()

		await render([20, 80], { onCommit })

		press(field(0), 'End')

		expect(onCommit.mock.calls).toEqual([[{ newValue: [80, 80], oldValue: [20, 80] }]])
	})

	it('ctrl: значение снаружи и из разметки — одно', async () => {
		const ctrl = new TSlider({ value: 10 })

		mount(() => <Slider ctrl={ctrl} />)
		await nextFrame()

		ctrl.value = 40

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
		await render([20, 80])

		const thumbs = all('.so-slider__thumb')
		const second = field(1)

		second.focus()
		press(second, 'ArrowLeft')

		expect(all('.so-slider__thumb')).toEqual(thumbs)
		expect(field(1)).toBe(second)
		expect(document.activeElement).toBe(second)
		expect(second.value).toBe('79')
	})

	it('ручку добавили — прежние остаются теми же узлами', async () => {
		const { setValue } = await render([20, 80])

		const [first, second] = fields()

		setValue([20, 50, 90])

		expect(fields()).toHaveLength(3)
		expect(field(0)).toBe(first)
		expect(field(1)).toBe(second)
		expect(fields().map((node) => node.value)).toEqual(['20', '50', '90'])
	})

	/**
	 * Значение поля браузер прижимает к ходу: записанное раньше нового `max`,
	 * оно встало бы на прежний край. Поэтому значение пишет `ref` поля — после
	 * атрибутов хода.
	 */
	it('ход и значение сменились разом — значение поля по новому ходу', async () => {
		const [max, setMax] = createSignal(100)
		const [value, setValue] = createSignal(50)

		mount(() => <Slider value={value()} max={max()} />)
		await nextFrame()

		batch(() => {
			setMax(300)
			setValue(250)
		})

		expect(field().max).toBe('300')
		expect(field().value).toBe('250')
	})
})

describe('слоты со scope', () => {
	it('mark получает значение и подпись метки', () => {
		mount(() => (
			<Slider
				marks={[{ value: 0, label: 'Мин' }, { value: 100 }]}
				mark={({ value, label }) => `${label ?? '—'}:${value}`}
			/>
		))

		expect(all('.so-slider__mark-label').map((node) => node.textContent)).toEqual([
			'Мин:0',
			'—:100',
		])
	})

	it('thumb — содержимое подсказки, со значением и номером ручки', () => {
		mount(() => (
			<Slider
				value={[20, 80]}
				tooltip="always"
				thumb={({ value, index }) => (
					<b class="so-test-thumb">
						{index}:{value}
					</b>
				)}
			/>
		))

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

	it('без режима подсказки нет, и слот thumb не зовётся', () => {
		const thumb = vi.fn((_scope: { value: number; index: number }) => (
			<b class="so-test-thumb">?</b>
		))

		// Функцию слота адаптер узнаёт по арности, а у шпиона она нулевая
		mount(() => <Slider value={[20, 80]} thumb={(scope) => thumb(scope)} />)

		expect(root().classList.contains('so-slider--tooltip-none')).toBe(true)
		expect(tooltips()).toEqual([])
		expect(thumb).not.toHaveBeenCalled()
	})

	it('auto — по подсказке на ручку сразу после поля, под aria-hidden', async () => {
		await render([20, 80], { tooltip: 'auto' })

		expect(root().classList.contains('so-slider--tooltip-auto')).toBe(true)
		expect(tooltips().map((node) => node.localName)).toEqual(['span', 'span'])
		expect(tooltips().map((node) => node.previousElementSibling?.localName)).toEqual([
			'input',
			'input',
		])
		expect(tooltips().map((node) => node.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
	})

	it('текст — значение ручки, без пробелов, и меняется вместе с ним', async () => {
		await render([20, 80], { tooltip: 'auto' })

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '80'])

		press(field(1), 'ArrowLeft')

		expect(tooltips().map((node) => node.textContent)).toEqual(['20', '79'])
	})

	it('режим с экземпляра: включили — подсказка есть, выключили — нет', () => {
		const ctrl = new TSlider({ value: 30 })

		mount(() => <Slider ctrl={ctrl} />)

		expect(tooltips()).toEqual([])

		ctrl.tooltip = 'always'

		expect(root().classList.contains('so-slider--tooltip-always')).toBe(true)
		expect(tooltips().map((node) => node.textContent)).toEqual(['30'])

		ctrl.tooltip = 'none'

		expect(tooltips()).toEqual([])
	})

	it('режим из разметки сменился — подсказки за ним', () => {
		const [tooltip, setTooltip] = createSignal<TSliderTooltip>('none')

		mount(() => <Slider value={[20, 80]} tooltip={tooltip()} />)

		setTooltip('always')

		expect(tooltips()).toHaveLength(2)

		setTooltip('none')

		expect(tooltips()).toEqual([])
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
		mount(() => (
			<Label text="Цена">
				<Slider value={[20, 80]} />
			</Label>
		))

		expect(find(document, 'label', HTMLLabelElement).control).toBe(field(0))
	})
})
