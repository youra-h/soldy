import { describe, it, expect, vi } from 'vitest'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps, TSliderValue } from '@soldy-ui/core'

/**
 * TSlider — значение, шкала и команды перетаскивания (`ISlidable`).
 *
 * Жест здесь ведут команды, как их зовёт плагин указателя: доля хода уже в
 * направлении роста (0 — у `min`). Перевод точки указателя в долю и клавиш в
 * команды проверяют плагины (`plugins/__tests__/slide-*.plugin.spec.ts`),
 * настоящий ввод — браузер (`playground/vue/browser/slider.spec.ts`).
 */

const slider = (props: Partial<ISliderProps> = {}) => new TSlider(props)

/** Все `change:value` и `commit` ползунка — в порядке прихода. */
function record(instance: TSlider) {
	const values: TSliderValue[] = []
	const commits: Array<{ newValue: TSliderValue; oldValue: TSliderValue }> = []

	instance.events.on('change:value', ({ newValue }) => values.push(newValue))
	instance.events.on('commit', (payload) => commits.push(payload))

	return { values, commits }
}

describe('разметка корня', () => {
	it('корень — span с классом блока и ориентацией; aria-orientation — полям', () => {
		const instance = slider()

		expect(instance.tag).toBe('span')
		expect(instance.classes.toArray()).toContain('s-slider')
		expect(instance.classes.toArray()).toContain('s-slider--horizontal')
		expect(instance.aria.get('aria-orientation')).toBe('horizontal')

		instance.orientation = 'vertical'

		expect(instance.classes.toArray()).toContain('s-slider--vertical')
		expect(instance.classes.toArray()).not.toContain('s-slider--horizontal')
		expect(instance.aria.get('aria-orientation')).toBe('vertical')
	})

	it('ARIA-дублей полю нет: выключенный ползунок — без aria-disabled', () => {
		const instance = slider({ disabled: true })

		expect(instance.aria.has('aria-disabled')).toBe(false)
		expect(instance.attrs.has('disabled')).toBe(false)
		expect(instance.dataset.get('data-disabled')).toBe('true')
	})

	it('data-dragging стоит с первой отрисовки: «false»', () => {
		expect(slider().dataset.get('data-dragging')).toBe('false')
	})
})

describe('форма значения сохраняется', () => {
	it('число остаётся числом, массив — массивом', () => {
		expect(slider({ value: 30 }).value).toBe(30)
		expect(slider({ value: [30] }).value).toEqual([30])
		expect(slider({ value: [20, 80] }).value).toEqual([20, 80])
	})

	it('по умолчанию — 0, одна ручка', () => {
		const instance = slider()

		expect(instance.value).toBe(0)
		expect(instance.values).toEqual([0])
	})

	it('жест и клавиша пишут значение в той же форме', () => {
		const single = slider({ value: 30 })
		const range = slider({ value: [20, 80] })

		single.shift(0, 1)
		range.shift(1, 1)

		expect(single.value).toBe(31)
		expect(range.value).toEqual([20, 81])
	})
})

describe('итог значения — шкала', () => {
	it('значение прижато к границам и приведено к шагу', () => {
		expect(slider({ value: 150 }).value).toBe(100)
		expect(slider({ value: -5 }).value).toBe(0)
		expect(slider({ value: 33, step: 10 }).value).toBe(30)
		expect(slider({ value: 7, step: [0, 5, 10] }).value).toBe(5)
	})

	it('массив упорядочен, соседей резольвер не раздвигает', () => {
		const instance = slider({ value: [80, 20, 21], minStepsBetweenThumbs: 10 })

		expect(instance.value).toEqual([20, 21, 80])
	})

	/**
	 * Хранится значение как задано, поэтому порядок записи не важен: внешнему
	 * `ctrl` сборка пишет `value` раньше `max`.
	 */
	it('порядок записи: value = 150 при max = 100, затем max = 200 — 150', () => {
		const instance = slider()

		instance.value = 150
		expect(instance.value).toBe(100)

		instance.max = 200
		expect(instance.value).toBe(150)
	})

	it('смена шкалы шлёт change:value, только когда сменился итог', () => {
		const instance = slider({ value: 50 })
		const { values } = record(instance)

		instance.max = 200
		expect(values).toEqual([])

		instance.max = 40
		expect(values).toEqual([40])

		instance.step = 15
		expect(values).toEqual([40, 30])
	})

	it('тот же массив — не смена: ни записи, ни события', () => {
		const instance = slider({ value: [20, 80] })
		const { values } = record(instance)

		instance.value = [20, 80]
		instance.value = [80, 20]

		expect(values).toEqual([])
	})

	it('шаг и имена ручек тем же составом — не смена', () => {
		const instance = slider({ step: [1, 2, 5], thumbLabels: ['От', 'До'] })
		const changes = vi.fn()

		instance.events.on('change:step', changes)
		instance.events.on('change:thumbLabels', changes)

		instance.step = [1, 2, 5]
		instance.thumbLabels = ['От', 'До']

		expect(changes).not.toHaveBeenCalled()
	})
})

describe('жест указателя', () => {
	it('нажатие мимо ручек ставит ближайшую ручку в точку нажатия', () => {
		const instance = slider({ value: [20, 80] })

		expect(instance.press(0.4)).toBe(true)
		expect(instance.value).toEqual([40, 80])
		expect(instance.activeThumb).toBe(0)

		instance.release()
		instance.press(0.7)

		expect(instance.value).toEqual([40, 70])
		expect(instance.activeThumb).toBe(1)
	})

	it('поровну от двух ручек — ведёт меньшая', () => {
		const instance = slider({ value: [40, 60] })

		instance.press(0.5)

		expect(instance.activeThumb).toBe(0)
		expect(instance.value).toEqual([50, 60])
	})

	it('захват ручки значение не меняет; ручка идёт за указателем со смещением захвата', () => {
		const instance = slider({ value: 50 })

		// Взялись за край ручки: указатель в 0.52, ручка — в 0.5
		expect(instance.grab(0, 0.52)).toBe(true)
		expect(instance.value).toBe(50)

		instance.drag(0.62)
		expect(instance.value).toBe(60)
	})

	it('ручка не выходит за соседей: ручки не перехлёстываются', () => {
		const instance = slider({ value: [20, 80] })

		instance.grab(0, 0.2)
		instance.drag(0.95)

		expect(instance.value).toEqual([80, 80])

		instance.release()
		instance.grab(1, 0.8)
		instance.drag(0.1)

		// На общем значении движение к меньшим ведёт первую ручку, а не вторую
		expect(instance.value).toEqual([10, 80])
	})

	it('ручки на одном значении: какую тянуть, решает направление первого движения', () => {
		const toMax = slider({ value: [50, 50] })
		const toMin = slider({ value: [50, 50] })

		toMax.grab(0, 0.5)
		toMax.drag(0.7)
		toMin.grab(1, 0.5)
		toMin.drag(0.3)

		expect(toMax.value).toEqual([50, 70])
		expect(toMax.activeThumb).toBe(1)
		expect(toMin.value).toEqual([30, 50])
		expect(toMin.activeThumb).toBe(0)
	})

	it('нажатие рядом с общим значением ведёт ручку в сторону нажатия', () => {
		const below = slider({ value: [50, 50] })
		const above = slider({ value: [50, 50] })

		below.press(0.4)
		above.press(0.6)

		expect(below.value).toEqual([40, 50])
		expect(above.value).toEqual([50, 60])
	})

	it('minStepsBetweenThumbs держит зазор в шагах шкалы', () => {
		const instance = slider({ value: [20, 80], step: 5, minStepsBetweenThumbs: 2 })

		instance.grab(0, 0.2)
		instance.drag(1)

		expect(instance.value).toEqual([70, 80])

		instance.release()
		instance.shift(1, -5)

		expect(instance.value).toEqual([70, 80])
	})

	it('соседи ближе зазора: ручка не прыгает, а только не подходит ближе', () => {
		const instance = slider({ value: [50, 52], minStepsBetweenThumbs: 5 })

		instance.shift(1, -1)
		expect(instance.value).toEqual([50, 52])

		instance.shift(1, 1)
		expect(instance.value).toEqual([50, 53])
	})

	it('dragging ставит первое движение, а не нажатие; release снимает', () => {
		const instance = slider({ value: 50 })
		const changes = vi.fn()

		instance.events.on('change:dragging', changes)

		instance.press(0.2)
		expect(instance.dragging).toBe(false)
		expect(instance.dataset.get('data-dragging')).toBe('false')

		// Движения ещё не было — указатель на месте нажатия
		instance.drag(0.2)
		expect(instance.dragging).toBe(false)

		instance.drag(0.3)
		expect(instance.dragging).toBe(true)
		expect(instance.dataset.get('data-dragging')).toBe('true')
		expect(instance.thumbs[0].dataset).toEqual({ 'data-dragging': 'true' })

		instance.release()
		expect(instance.dragging).toBe(false)
		expect(instance.activeThumb).toBeUndefined()
		expect(instance.thumbs[0].dataset).toEqual({ 'data-dragging': 'false' })
		expect(changes.mock.calls).toEqual([[true], [false]])
	})

	it('вне жеста drag и release ничего не делают', () => {
		const instance = slider({ value: 50 })
		const { values, commits } = record(instance)

		instance.drag(0.9)
		instance.release()

		expect(instance.value).toBe(50)
		expect(values).toEqual([])
		expect(commits).toEqual([])
	})

	it('выключенный ползунок жест не начинает', () => {
		const instance = slider({ value: 50, disabled: true })

		expect(instance.press(0.1)).toBe(false)
		expect(instance.grab(0, 0.5)).toBe(false)

		instance.drag(0.9)
		instance.shift(0, 1)
		instance.moveToEdge(0, 'end')

		expect(instance.value).toBe(50)
	})

	it('ручки с таким номером нет — жеста нет', () => {
		const instance = slider({ value: [20, 80] })

		expect(instance.grab(2, 0.5)).toBe(false)
		expect(instance.grab(-1, 0.5)).toBe(false)
		expect(slider({ value: [] }).press(0.5)).toBe(false)
	})
})

describe('commit — одно событие на действие', () => {
	it('один на жест, со значением до жеста', () => {
		const instance = slider({ value: 50 })
		const { values, commits } = record(instance)

		instance.grab(0, 0.5)
		instance.drag(0.55)
		instance.drag(0.6)
		instance.drag(0.7)
		instance.release()

		expect(values).toEqual([55, 60, 70])
		expect(commits).toEqual([{ newValue: 70, oldValue: 50 }])
	})

	it('нет, если за жест значение не сменилось', () => {
		const instance = slider({ value: 50 })
		const { commits } = record(instance)

		instance.grab(0, 0.5)
		instance.drag(0.7)
		instance.drag(0.5)
		instance.release()

		expect(commits).toEqual([])
	})

	it('нажатие без протяжки — тоже жест: прыжок ручки коммитится на отпускании', () => {
		const instance = slider({ value: [20, 80] })
		const { commits } = record(instance)

		instance.press(0.4)
		expect(commits).toEqual([])

		instance.release()
		expect(commits).toEqual([{ newValue: [40, 80], oldValue: [20, 80] }])
	})

	it('после каждого сдвига клавишей, сменившего значение', () => {
		const instance = slider({ value: 99 })
		const { commits } = record(instance)

		instance.shift(0, 1)
		instance.shift(0, 1)
		instance.moveToEdge(0, 'start')

		expect(commits).toEqual([
			{ newValue: 100, oldValue: 99 },
			{ newValue: 0, oldValue: 100 },
		])
	})
})

describe('клавиши: шаг и край хода', () => {
	it('shift — на шаги шкалы, у списка — к соседнему элементу', () => {
		const grid = slider({ value: 50, step: 5 })
		const list = slider({ value: 5, step: [1, 2, 5, 10, 20] })

		grid.shift(0, 2)
		list.shift(0, 1)

		expect(grid.value).toBe(60)
		expect(list.value).toBe(10)
	})

	it('moveToEdge — край хода ручки: у крайней — край шкалы, у внутренней — сосед', () => {
		const instance = slider({ value: [20, 50, 80] })

		instance.moveToEdge(1, 'end')
		expect(instance.value).toEqual([20, 80, 80])

		instance.moveToEdge(0, 'start')
		expect(instance.value).toEqual([0, 80, 80])

		instance.moveToEdge(2, 'end')
		expect(instance.value).toEqual([0, 80, 100])
	})

	it('край хода — последний узел сетки, а не max вне сетки', () => {
		const instance = slider({ value: 0, max: 10, step: 3 })

		instance.moveToEdge(0, 'end')

		expect(instance.value).toBe(9)
	})
})

describe('выходы для разметки', () => {
	it('ручки: значение, ход поля, шаг, позиция и имя', () => {
		const instance = slider({
			value: [20, 60],
			minStepsBetweenThumbs: 5,
			thumbLabels: ['Минимум', 'Максимум'],
		})

		expect(instance.thumbs).toEqual([
			{
				value: 20,
				min: 0,
				max: 55,
				step: 1,
				style: { '--s-slider-position': '20%' },
				dataset: { 'data-dragging': 'false' },
				aria: { 'aria-label': 'Минимум' },
			},
			{
				value: 60,
				min: 25,
				max: 100,
				step: 1,
				style: { '--s-slider-position': '60%' },
				dataset: { 'data-dragging': 'false' },
				aria: { 'aria-label': 'Максимум' },
			},
		])
	})

	it('у списка шаг поля — any, у ручки без имени набор пуст', () => {
		const [thumb] = slider({ value: 5, step: [1, 5, 10], max: 10 }).thumbs

		expect(thumb.step).toBe('any')
		expect(thumb.aria).toEqual({})
	})

	it('ход поля всегда содержит значение', () => {
		const [first, second] = slider({ value: [50, 52], minStepsBetweenThumbs: 5 }).thumbs

		expect([first.min, first.max]).toEqual([0, 50])
		expect([second.min, second.max]).toEqual([52, 100])
	})

	it('позиции с шагом дробным — без хвоста плавающей точки', () => {
		const instance = slider({ value: 0.3, min: 0, max: 1, step: 0.1 })

		expect(instance.thumbs[0].style).toEqual({ '--s-slider-position': '30%' })
	})

	it('заливка одной ручки — от min, двух — между ними', () => {
		expect(slider({ value: 30 }).rangeStyle).toEqual({
			'--s-slider-range-start': '0%',
			'--s-slider-range-end': '30%',
		})
		expect(slider({ value: [20, 70] }).rangeStyle).toEqual({
			'--s-slider-range-start': '20%',
			'--s-slider-range-end': '70%',
		})
	})

	it('origin: заливка одной ручки — от него, в обе стороны', () => {
		const instance = slider({ min: -50, max: 50, origin: 0, value: 25 })

		expect(instance.rangeStyle).toEqual({
			'--s-slider-range-start': '50%',
			'--s-slider-range-end': '75%',
		})

		instance.value = -25

		expect(instance.rangeStyle).toEqual({
			'--s-slider-range-start': '25%',
			'--s-slider-range-end': '50%',
		})
	})

	it('inverted: позиции от начала оси перевёрнуты, начало заливки не дальше конца', () => {
		const instance = slider({ value: [20, 70], inverted: true })

		expect(instance.thumbs.map((thumb) => thumb.style)).toEqual([
			{ '--s-slider-position': '80%' },
			{ '--s-slider-position': '30%' },
		])
		expect(instance.rangeStyle).toEqual({
			'--s-slider-range-start': '30%',
			'--s-slider-range-end': '80%',
		})
	})

	it('меток нет — пусто; true — точки шкалы без подписей', () => {
		expect(slider().shownMarks).toEqual([])

		const instance = slider({ value: 50, max: 100, step: 25, marks: true })

		expect(instance.shownMarks.map(({ value, label }) => [value, label])).toEqual([
			[0, undefined],
			[25, undefined],
			[50, undefined],
			[75, undefined],
			[100, undefined],
		])
	})

	it('true у шага списком — элементы списка', () => {
		const instance = slider({ step: [0, 10, 50, 100], marks: true })

		expect(instance.shownMarks.map(({ value }) => value)).toEqual([0, 10, 50, 100])
	})

	it('список меток: подписи, позиции и состояния; метка вне хода не показывается', () => {
		const instance = slider({
			value: [20, 50],
			marks: [
				{ value: 0, label: 'Ноль' },
				{ value: 20 },
				{ value: 50, label: 'Половина' },
				{ value: 80, label: 'Много' },
				{ value: 150, label: 'Вне хода' },
			],
		})

		expect(instance.shownMarks).toEqual([
			{
				value: 0,
				label: 'Ноль',
				style: { '--s-slider-position': '0%' },
				dataset: { 'data-in-range': 'false', 'data-current': 'false' },
			},
			{
				value: 20,
				label: undefined,
				style: { '--s-slider-position': '20%' },
				dataset: { 'data-in-range': 'true', 'data-current': 'true' },
			},
			{
				value: 50,
				label: 'Половина',
				style: { '--s-slider-position': '50%' },
				dataset: { 'data-in-range': 'true', 'data-current': 'true' },
			},
			{
				value: 80,
				label: 'Много',
				style: { '--s-slider-position': '80%' },
				dataset: { 'data-in-range': 'false', 'data-current': 'false' },
			},
		])
	})

	it('метка внутри заливки от origin — с обеих сторон, края включительно', () => {
		const instance = slider({
			min: -10,
			max: 10,
			origin: 0,
			value: -5,
			marks: [{ value: -10 }, { value: -5 }, { value: 0 }, { value: 5 }],
		})

		expect(instance.shownMarks.map(({ dataset }) => dataset['data-in-range'])).toEqual([
			'false',
			'true',
			'true',
			'false',
		])
	})
})

/**
 * Щелчок к меткам решает стратегия плагина указателя
 * (`plugins/__tests__/slide-snap-strategies.spec.ts`), а ядро держит режим и
 * радиус, отдаёт доли меток и ручек и доводит ручку командой `settle`.
 */
describe('щелчок', () => {
	it('по умолчанию щелчка нет, радиус — 8 px; смена шлёт событие один раз', () => {
		const instance = slider()
		const snaps = vi.fn()
		const radii = vi.fn()

		instance.events.on('change:snap', snaps)
		instance.events.on('change:snapRadius', radii)

		expect(instance.snap).toBe('none')
		expect(instance.snapRadius).toBe(8)

		instance.snap = 'magnet'
		instance.snap = 'magnet'
		instance.snapRadius = 12
		instance.snapRadius = 12

		expect(snaps.mock.calls).toEqual([['magnet']])
		expect(radii.mock.calls).toEqual([[12]])
	})

	it('точки щелчка — доли показанных меток: по возрастанию, без повторов, вне хода нет', () => {
		const instance = slider({
			min: -50,
			max: 50,
			marks: [{ value: 25 }, { value: -50 }, { value: 25, label: 'Снова' }, { value: 80 }],
		})

		expect(instance.snapPoints).toEqual([0, 0.75])
	})

	it('точки у marks: true — точки шкалы; без меток — пусто', () => {
		expect(slider({ step: 25, marks: true }).snapPoints).toEqual([0, 0.25, 0.5, 0.75, 1])
		expect(slider({ step: [0, 10, 100], marks: true }).snapPoints).toEqual([0, 0.1, 1])
		expect(slider({ snap: 'magnet' }).snapPoints).toEqual([])
	})

	/**
	 * Доли — в направлении роста, как у команд жеста: плагин переводит в них
	 * указатель с учётом `inverted` сам. Перевернуть их ещё раз значило бы
	 * притянуть ручку к зеркальной метке.
	 */
	it('inverted не переворачивает доли меток и ручек — только позиции на экране', () => {
		const instance = slider({ value: [20, 70], inverted: true, marks: [{ value: 20 }] })

		expect(instance.snapPoints).toEqual([0.2])
		expect(instance.fractions).toEqual([0.2, 0.7])
		expect(instance.shownMarks[0].style).toEqual({ '--s-slider-position': '80%' })
	})

	it('доли ручек — по порядку ручек, у одной ручки — одна', () => {
		expect(slider({ value: 30 }).fractions).toEqual([0.3])
		expect(slider({ value: [10, 60], min: 0, max: 200 }).fractions).toEqual([0.05, 0.3])
	})
})

describe('settle — жест закончен доводкой', () => {
	it('ручка встаёт в долю уже без перетаскивания; commit — один, с доведённым значением', () => {
		const instance = slider({ value: 50 })
		const order: string[] = []
		const { commits } = record(instance)

		instance.grab(0, 0.5)
		instance.drag(0.57)

		instance.events.on('change:dragging', (value) => order.push(`dragging:${value}`))
		instance.events.on('change:value', ({ newValue }) => order.push(`value:${newValue}`))

		instance.settle(0.6)

		expect(instance.value).toBe(60)
		expect(instance.dragging).toBe(false)
		expect(instance.activeThumb).toBeUndefined()
		// Сначала снято перетаскивание — переход темы довозит ручку
		expect(order).toEqual(['dragging:false', 'value:60'])
		expect(commits).toEqual([{ newValue: 60, oldValue: 50 }])
	})

	it('доведённая ручка не уходит за соседа', () => {
		const instance = slider({ value: [40, 60] })

		instance.grab(0, 0.4)
		instance.drag(0.55)
		instance.settle(0.75)

		expect(instance.value).toEqual([60, 60])
	})

	it('нажатие без протяжки и доводка — один commit на всё действие', () => {
		const instance = slider({ value: 10 })
		const { commits } = record(instance)

		instance.press(0.48)
		instance.settle(0.5)

		expect(commits).toEqual([{ newValue: 50, oldValue: 10 }])
	})

	it('доводка в то же значение — commit по жесту, без лишнего', () => {
		const instance = slider({ value: 50 })
		const { commits } = record(instance)

		instance.grab(0, 0.5)
		instance.drag(0.6)
		instance.settle(0.6)

		expect(commits).toEqual([{ newValue: 60, oldValue: 50 }])
	})

	it('вне жеста ничего не делает', () => {
		const instance = slider({ value: 50 })
		const { values, commits } = record(instance)

		instance.settle(0.9)

		expect(instance.value).toBe(50)
		expect(values).toEqual([])
		expect(commits).toEqual([])
	})
})

describe('getProps', () => {
	it('отдаёт свои пропсы', () => {
		const props = slider({
			value: [1, 2],
			min: -1,
			max: 5,
			step: [1, 2],
			largeStep: 3,
			orientation: 'vertical',
			inverted: true,
			origin: 0,
			marks: true,
			minStepsBetweenThumbs: 1,
			thumbLabels: ['a', 'b'],
			snap: 'plateau',
			snapRadius: 12,
		}).getProps()

		expect(props).toMatchObject({
			value: [1, 2],
			min: -1,
			max: 5,
			step: [1, 2],
			largeStep: 3,
			orientation: 'vertical',
			inverted: true,
			origin: 0,
			marks: true,
			minStepsBetweenThumbs: 1,
			thumbLabels: ['a', 'b'],
			snap: 'plateau',
			snapRadius: 12,
		})
	})
})
