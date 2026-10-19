import { describe, it, expect } from 'vitest'
import { TRating } from '@soldy-ui/core'
import type { IRatingProps } from '@soldy-ui/core'

/**
 * TRating — значение на шкале звёзд, команды перетаскивания (`ISlidable`) и
 * предпросмотр наведением.
 *
 * Нажатие и наведение здесь ведут команды, как их зовут плагины: доля ряда
 * уже в направлении роста (0 — у начала первой звезды). Перевод точки
 * указателя в долю и клавиш в команды проверяют плагины
 * (`plugins/__tests__/slide-*.plugin.spec.ts`,
 * `plugins/__tests__/rating-hover.plugin.spec.ts`), настоящий ввод — браузер
 * (`playground/vue/browser/rating.spec.ts`).
 */

const rating = (props: Partial<IRatingProps> = {}) => new TRating(props)

/** Все `change:value`, `commit` и `change:preview` оценки — в порядке прихода. */
function record(instance: TRating) {
	const values: number[] = []
	const commits: Array<{ newValue: number; oldValue: number }> = []
	const previews: Array<number | undefined> = []

	instance.events.on('change:value', ({ newValue }) => values.push(newValue))
	instance.events.on('commit', (payload) => commits.push(payload))
	instance.events.on('change:preview', (value) => previews.push(value))

	return { values, commits, previews }
}

/** Доли заливки звёзд — как их получит тема. */
const fractions = (instance: TRating) =>
	instance.stars.map((star) => star.style['--so-rating-fraction'])

describe('разметка корня', () => {
	it('корень — span с классом блока; ARIA-дублей полю нет', () => {
		const instance = rating({ disabled: true })

		expect(instance.tag).toBe('span')
		expect(instance.classes.toArray()).toContain('so-rating')
		expect(instance.aria.has('aria-disabled')).toBe(false)
		expect(instance.attrs.has('disabled')).toBe(false)
		expect(instance.dataset.get('data-disabled')).toBe('true')
	})

	it('только для показа — модификатор корня и aria-readonly полю, required — без ARIA', () => {
		const instance = rating({ required: true })

		expect(instance.aria.has('aria-readonly')).toBe(false)
		expect(instance.aria.has('aria-required')).toBe(false)

		instance.readonly = true

		expect(instance.classes.toArray()).toContain('so-rating--readonly')
		expect(instance.aria.get('aria-readonly')).toBe('true')

		instance.readonly = false

		expect(instance.classes.toArray()).not.toContain('so-rating--readonly')
		expect(instance.aria.has('aria-readonly')).toBe(false)
	})
})

describe('итог значения — шкала звёзд', () => {
	it('по умолчанию — 0 из 5, шаг — целая звезда', () => {
		const instance = rating()

		expect(instance.value).toBe(0)
		expect(instance.max).toBe(5)
		expect(instance.step).toBe(1)
		expect(instance.stars).toHaveLength(5)
	})

	it('значение прижато к 0 и max и приведено к шагу', () => {
		expect(rating({ value: 7 }).value).toBe(5)
		expect(rating({ value: -1 }).value).toBe(0)
		expect(rating({ value: 3.4 }).value).toBe(3)
		expect(rating({ value: 3.4, step: 0.5 }).value).toBe(3.5)
		expect(rating({ value: 4.3, step: 0.1 }).value).toBe(4.3)
	})

	it('звёзд — целое число: дробная часть max отбрасывается', () => {
		const instance = rating({ max: 7.5, value: 9 })

		expect(instance.stars).toHaveLength(7)
		expect(instance.value).toBe(7)
	})

	/**
	 * Бесконечность шкала считает открытой стороной (поле числа без границ), а
	 * ряд звёзд без конца не нарисовать: у оценки такой `max` — не число звёзд.
	 */
	it('max бесконечный или не число — пустой ряд, оценка 0', () => {
		for (const max of [Infinity, Number.NaN]) {
			const instance = rating({ max, value: 3 })

			expect(instance.stars).toHaveLength(0)
			expect(instance.value).toBe(0)
		}
	})

	/**
	 * Хранится значение как задано, поэтому порядок записи не важен: внешнему
	 * `ctrl` сборка пишет `value` раньше `max`.
	 */
	it('порядок записи: value = 8 при max = 5, затем max = 10 — 8', () => {
		const instance = rating()

		instance.value = 8
		expect(instance.value).toBe(5)

		instance.max = 10
		expect(instance.value).toBe(8)
	})

	it('смена шкалы шлёт change:value, только когда сменился итог', () => {
		const instance = rating({ value: 3, step: 0.5 })
		const { values } = record(instance)

		instance.max = 10
		expect(values).toEqual([])

		instance.max = 2
		expect(values).toEqual([2])

		instance.max = 5
		instance.step = 2
		expect(values).toEqual([2, 3, 4])
	})

	it('change:max и change:step — только на смену', () => {
		const instance = rating()
		const events: string[] = []

		instance.events.on('change:max', (value) => events.push(`max ${value}`))
		instance.events.on('change:step', (value) => events.push(`step ${value}`))

		instance.max = 5
		instance.step = 1
		instance.max = 10
		instance.step = 0.5

		expect(events).toEqual(['max 10', 'step 0.5'])
		expect(instance.getProps()).toMatchObject({ max: 10, step: 0.5 })
	})
})

describe('звёзды — выход для разметки', () => {
	it('номер звезды и доля её заливки от значения', () => {
		const instance = rating({ value: 3 })

		expect(instance.stars.map((star) => star.value)).toEqual([1, 2, 3, 4, 5])
		expect(fractions(instance)).toEqual(['1', '1', '1', '0', '0'])
	})

	it('половина — доля 0,5; мелкий шаг — любая доля', () => {
		expect(fractions(rating({ value: 2.5, step: 0.5 }))).toEqual(['1', '1', '0.5', '0', '0'])
		expect(fractions(rating({ value: 4.3, step: 0.1, readonly: true }))).toEqual([
			'1',
			'1',
			'1',
			'1',
			'0.3',
		])
	})

	it('звёзд столько, сколько max', () => {
		const instance = rating({ value: 2 })

		instance.max = 10

		expect(instance.stars).toHaveLength(10)
		expect(fractions(instance).slice(0, 3)).toEqual(['1', '1', '0'])
	})
})

describe('нажатие ставит оценку', () => {
	it('в любом месте звезды — её целиком: доля округляется вверх, к шагу', () => {
		const instance = rating()

		// Пятая доля ряда из пяти звёзд — конец первой
		instance.press(0.05)
		instance.release()
		expect(instance.value).toBe(1)

		instance.press(0.55)
		instance.release()
		expect(instance.value).toBe(3)

		instance.press(0.79)
		instance.release()
		expect(instance.value).toBe(4)
	})

	it('при шаге 0,5 левая половина звезды — половина, правая — целая', () => {
		const instance = rating({ step: 0.5 })

		instance.press(0.45)
		expect(instance.value).toBe(2.5)

		instance.drag(0.55)
		expect(instance.value).toBe(3)

		instance.release()
	})

	it('нажатием ставят хотя бы один шаг: 0 — «оценки нет», его ставит клавиша', () => {
		const whole = rating({ value: 3 })
		const half = rating({ value: 3, step: 0.5 })

		whole.press(0)
		half.press(-0.2)

		expect(whole.value).toBe(1)
		expect(half.value).toBe(0.5)
	})

	it('за правым краем ряда — наибольшая оценка', () => {
		const instance = rating()

		instance.press(0.9)
		instance.drag(1.4)

		expect(instance.value).toBe(5)
	})

	it('протяжка ведёт оценку, commit — один на нажатие', () => {
		const instance = rating({ value: 1 })
		const { values, commits } = record(instance)

		expect(instance.press(0.3)).toBe(true)
		expect(instance.activeThumb).toBe(0)

		instance.drag(0.5)
		instance.drag(0.9)
		instance.release()

		expect(values).toEqual([2, 3, 5])
		expect(commits).toEqual([{ newValue: 5, oldValue: 1 }])
		expect(instance.activeThumb).toBeUndefined()
	})

	it('нажатие на ту же оценку — без commit', () => {
		const instance = rating({ value: 3 })
		const { commits } = record(instance)

		instance.press(0.5)
		instance.release()

		expect(commits).toEqual([])
	})

	it('ручка — весь ряд: нажатие на ней ставит оценку, как мимо неё', () => {
		const instance = rating()

		expect(instance.grab(0, 0.7)).toBe(true)
		expect(instance.value).toBe(4)
		expect(instance.grab(1, 0.2)).toBe(false)

		instance.release()
	})

	it('доводка — оценка встаёт в долю, commit один', () => {
		const instance = rating()
		const { commits } = record(instance)

		instance.press(0.1)
		instance.settle(0.5)

		expect(instance.value).toBe(3)
		expect(commits).toEqual([{ newValue: 3, oldValue: 0 }])

		instance.settle(0.9)
		expect(instance.value).toBe(3)
	})

	it('вне нажатия протяжка ничего не делает', () => {
		const instance = rating({ value: 2 })

		instance.drag(0.9)

		expect(instance.value).toBe(2)
	})

	it('выключенную и только для показа оценку нажатие не меняет', () => {
		const disabled = rating({ value: 2, disabled: true })
		const readonly = rating({ value: 2, readonly: true })

		expect(disabled.press(0.9)).toBe(false)
		expect(readonly.press(0.9)).toBe(false)
		expect(readonly.grab(0, 0.9)).toBe(false)
		expect(disabled.value).toBe(2)
		expect(readonly.value).toBe(2)
		expect(readonly.activeThumb).toBeUndefined()
	})
})

describe('клавиши', () => {
	it('шаг и край — законченные действия: значение и commit', () => {
		const instance = rating({ value: 2, step: 0.5 })
		const { commits } = record(instance)

		instance.shift(0, 1)
		expect(instance.value).toBe(2.5)

		instance.shift(0, -2)
		expect(instance.value).toBe(1.5)

		instance.moveToEdge(0, 'end')
		expect(instance.value).toBe(5)

		instance.moveToEdge(0, 'start')
		expect(instance.value).toBe(0)

		expect(commits.map(({ newValue }) => newValue)).toEqual([2.5, 1.5, 5, 0])
	})

	it('у края шага нет — и commit тоже', () => {
		const instance = rating({ value: 5 })
		const { commits } = record(instance)

		instance.shift(0, 1)
		instance.moveToEdge(0, 'end')

		expect(commits).toEqual([])
	})

	it('крупный шаг — звезда: у половинок это два шага', () => {
		expect(rating().largeStep).toBe(1)
		expect(rating({ step: 0.5 }).largeStep).toBe(2)
		expect(rating({ step: 0.1 }).largeStep).toBe(10)
		expect(rating({ step: 2 }).largeStep).toBe(1)
	})

	it('только для показа и выключенная — клавиши значение не меняют', () => {
		const readonly = rating({ value: 2, readonly: true })
		const disabled = rating({ value: 2, disabled: true })

		readonly.shift(0, 1)
		readonly.moveToEdge(0, 'end')
		disabled.shift(0, 1)

		expect(readonly.value).toBe(2)
		expect(disabled.value).toBe(2)
	})

	it('ручка у оценки одна', () => {
		const instance = rating({ value: 2 })

		instance.shift(1, 1)
		instance.moveToEdge(1, 'end')

		expect(instance.value).toBe(2)
	})
})

describe('предпросмотр наведением', () => {
	it('звёзды показывают оценку, которую поставит нажатие; ушёл указатель — значение', () => {
		const instance = rating({ value: 1 })
		const { previews, values } = record(instance)

		instance.hover(0.7)

		expect(instance.preview).toBe(4)
		expect(fractions(instance)).toEqual(['1', '1', '1', '1', '0'])
		expect(values).toEqual([])

		instance.hover(0.75)
		instance.hover(undefined)

		expect(instance.preview).toBeUndefined()
		expect(fractions(instance)).toEqual(['1', '0', '0', '0', '0'])
		expect(previews).toEqual([4, undefined])
	})

	it('половина под указателем — при шаге 0,5', () => {
		const instance = rating({ step: 0.5 })

		instance.hover(0.45)

		expect(instance.preview).toBe(2.5)
		expect(fractions(instance)).toEqual(['1', '1', '0.5', '0', '0'])
	})

	it('у выключенной и только для показа оценки предпросмотра нет', () => {
		const disabled = rating({ disabled: true })
		const readonly = rating({ readonly: true })

		disabled.hover(0.5)
		readonly.hover(0.5)

		expect(disabled.preview).toBeUndefined()
		expect(readonly.preview).toBeUndefined()
	})

	it('выключили или сделали только для показа под указателем — предпросмотр снят', () => {
		const instance = rating()

		instance.hover(0.5)
		instance.disabled = true
		expect(instance.preview).toBeUndefined()

		instance.disabled = false
		instance.hover(0.5)
		instance.readonly = true
		expect(instance.preview).toBeUndefined()
	})

	it('клавиша снимает предпросмотр: звёзды показывают то, что она поставила', () => {
		const instance = rating({ value: 2 })

		instance.hover(0.9)
		instance.shift(0, 1)

		expect(instance.preview).toBeUndefined()
		expect(fractions(instance)).toEqual(['1', '1', '1', '0', '0'])
	})

	it('смена шкалы снимает предпросмотр', () => {
		const instance = rating()

		instance.hover(0.9)
		instance.max = 10

		expect(instance.preview).toBeUndefined()
	})
})

describe('контракт перетаскивания', () => {
	it('одна ручка вдоль строки, без обратного хода и щелчка', () => {
		const instance = rating({ value: 2 })

		expect(instance.orientation).toBe('horizontal')
		expect(instance.inverted).toBe(false)
		expect(instance.values).toEqual([2])
		expect(instance.fractions).toEqual([0.4])
		expect(instance.snap).toBe('none')
		expect(instance.snapRadius).toBe(0)
		expect(instance.snapPoints).toEqual([])
		expect(instance.activeThumb).toBeUndefined()
	})
})
