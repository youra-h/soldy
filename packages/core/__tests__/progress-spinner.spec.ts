import { describe, it, expect } from 'vitest'
import { TProgress, TProgressLinear, TProgressSpinner } from '@soldy-ui/core'
import type { IProgressProps } from '@soldy-ui/core'

/**
 * TProgressSpinner — индикатор выполнения кольцом: та же модель, что у линии
 * (база `TProgress`), в другой форме. Значение, шкала и флаг бега дают
 * скринридеру `aria-value*`, теме — `data-indeterminate` и долю
 * CSS-переменной; своё у кольца — только то, как доля уходит теме: числом от
 * 0 до 1, без единиц.
 *
 * Модель целиком проверяет спек линии (`progress-linear.spec.ts`), здесь — что
 * кольцо получает её такой же и отдаёт долю в своём виде. Разметку проверяет
 * `ui/vue/__tests__/progress-spinner.spec.ts`, переходы и бег темы — браузер
 * (`playground/vue/browser/progress-spinner.spec.ts`).
 */

const progressSpinner = (props: Partial<IProgressProps> = {}) => new TProgressSpinner(props)

/** Доля готового, как её получает разметка. */
const fractionOf = (instance: TProgressSpinner) =>
	instance.fractionStyle['--s-progress-spinner-fraction']

describe('умолчания', () => {
	it('доля — 0 на шкале 0–100, бега нет, корень — span с классом блока', () => {
		const instance = progressSpinner()

		expect(instance.value).toBe(0)
		expect(instance.min).toBe(0)
		expect(instance.max).toBe(100)
		expect(instance.indeterminate).toBe(false)
		expect(instance.tag).toBe('span')
		expect(instance.classes.toArray()).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-normal',
		])
		expect(instance.getProps()).toMatchObject({
			value: 0,
			min: 0,
			max: 100,
			indeterminate: false,
		})
	})

	it('пустое кольцо — доля известна: роль, aria-valuenow="0", data-indeterminate="false", доля 0', () => {
		const instance = progressSpinner()

		expect(instance.aria.toObject()).toEqual({
			role: 'progressbar',
			'aria-valuemin': '0',
			'aria-valuemax': '100',
			'aria-valuenow': '0',
		})
		expect(instance.dataset.get('data-indeterminate')).toBe('false')
		expect(instance.fractionStyle).toEqual({ '--s-progress-spinner-fraction': '0' })
	})

	it('имени по умолчанию нет: его даёт плагин, а не ядро', () => {
		const instance = progressSpinner({ value: 40 })

		expect(instance.aria.has('aria-label')).toBe(false)
		expect(instance.aria.has('aria-labelledby')).toBe(false)
	})
})

/**
 * Бег — флаг, и он главнее значения. Значения «неизвестно» у `value` нет, как
 * и у линии.
 */
describe('флаг бега', () => {
	it('снимает aria-valuenow и переменную доли, а значение хранит', () => {
		const instance = progressSpinner({ value: 60 })

		instance.indeterminate = true

		expect(instance.value).toBe(60)
		expect(instance.aria.has('aria-valuenow')).toBe(false)
		expect(instance.aria.get('aria-valuemax')).toBe('100')
		expect(instance.dataset.get('data-indeterminate')).toBe('true')
		expect(instance.fractionStyle).toEqual({})
	})

	it('снятый флаг возвращает хранимое значение, записанное и во время бега', () => {
		const instance = progressSpinner({ value: 60, indeterminate: true })

		instance.value = 25
		instance.max = 50

		expect(instance.fractionStyle).toEqual({})

		instance.indeterminate = false

		expect(instance.aria.get('aria-valuenow')).toBe('25')
		expect(instance.dataset.get('data-indeterminate')).toBe('false')
		expect(fractionOf(instance)).toBe('0.5')
	})
})

describe('доля готового', () => {
	it('от min до max — число от 0 до 1, без единиц', () => {
		expect(fractionOf(progressSpinner({ value: 40 }))).toBe('0.4')
		expect(fractionOf(progressSpinner({ value: 100 }))).toBe('1')
		expect(fractionOf(progressSpinner({ value: 15, min: 10, max: 20 }))).toBe('0.5')
	})

	it('за границами — край, и у доли, и у aria-valuenow; значение — как задано', () => {
		const below = progressSpinner({ value: -20 })
		const above = progressSpinner({ value: 140 })

		expect(fractionOf(below)).toBe('0')
		expect(below.aria.get('aria-valuenow')).toBe('0')
		expect(fractionOf(above)).toBe('1')
		expect(above.aria.get('aria-valuenow')).toBe('100')
		expect(above.value).toBe(140)
	})

	it('max не больше min — 0, а aria-valuenow — min', () => {
		const empty = progressSpinner({ value: 50, min: 50, max: 50 })
		const reversed = progressSpinner({ value: 30, min: 50, max: 10 })

		expect(fractionOf(empty)).toBe('0')
		expect(fractionOf(reversed)).toBe('0')
		expect(reversed.aria.get('aria-valuenow')).toBe('50')
	})

	it('треть — без хвоста плавающей точки', () => {
		expect(fractionOf(progressSpinner({ value: 1, max: 3 }))).toBe('0.333333')
		expect(fractionOf(progressSpinner({ value: 2, max: 3 }))).toBe('0.666667')
		expect(fractionOf(progressSpinner({ value: 0.3, max: 1 }))).toBe('0.3')
	})

	it('смена значения и шкалы пересчитывает долю', () => {
		const instance = progressSpinner({ value: 50 })

		instance.max = 200

		expect(fractionOf(instance)).toBe('0.25')
		expect(instance.aria.get('aria-valuenow')).toBe('50')

		instance.min = 40

		expect(fractionOf(instance)).toBe('0.0625')

		instance.value = 200

		expect(fractionOf(instance)).toBe('1')
	})
})

/**
 * Оси у кольца нет: дуга идёт по кругу, а не вдоль строки. Модификатор оси
 * и `aria-orientation` — только у линии.
 */
describe('оси нет', () => {
	it('ни модификатора оси, ни aria-orientation, ни свойства', () => {
		const instance = progressSpinner({ value: 40 })

		expect(
			instance.classes.toArray().filter((name) => /--(horizontal|vertical)$/.test(name)),
		).toEqual([])
		expect(instance.aria.has('aria-orientation')).toBe(false)
		expect('orientation' in instance.getProps()).toBe(false)
	})
})

describe('события — только на смену', () => {
	it('change:value, change:min, change:max и change:indeterminate: запись того же значения молчит', () => {
		const instance = progressSpinner({ value: 40 })
		const fired: string[] = []

		instance.events.on('change:value', (value) => fired.push(`value ${value}`))
		instance.events.on('change:min', (value) => fired.push(`min ${value}`))
		instance.events.on('change:max', (value) => fired.push(`max ${value}`))
		instance.events.on('change:indeterminate', (value) => fired.push(`indeterminate ${value}`))

		instance.value = 40
		instance.min = 0
		instance.max = 100
		instance.indeterminate = false

		expect(fired).toEqual([])

		instance.value = 50
		instance.value = 50
		instance.min = 10
		instance.max = 90
		instance.indeterminate = true
		instance.indeterminate = true

		expect(fired).toEqual(['value 50', 'min 10', 'max 90', 'indeterminate true'])
	})

	it('change:aria и change:dataset — когда набор сменился', () => {
		const instance = progressSpinner({ value: 40 })
		let aria = 0
		let dataset = 0

		instance.events.on('change:aria', () => (aria += 1))
		instance.events.on('change:dataset', () => (dataset += 1))

		instance.value = 40
		instance.indeterminate = false

		expect([aria, dataset]).toEqual([0, 0])

		instance.value = 60

		expect([aria, dataset]).toEqual([1, 0])

		instance.indeterminate = true

		expect([aria, dataset]).toEqual([2, 1])

		// Значение под бегом наборов не трогает: aria-valuenow нет
		instance.value = 70

		expect([aria, dataset]).toEqual([2, 1])
	})
})

/**
 * Линия и кольцо — две формы одной модели: на одних и тех же значениях они
 * объявляют скринридеру и теме одно и то же и различаются только видом доли.
 */
describe('одна модель с линией', () => {
	it.each([
		{ value: 40 },
		{ value: 140, max: 200 },
		{ value: 30, min: 50, max: 10 },
		{ value: 60, indeterminate: true },
	])('%o: те же aria и dataset', (props) => {
		const ring = progressSpinner(props)
		const line = new TProgressLinear(props)

		expect(ring).toBeInstanceOf(TProgress)
		expect(line).toBeInstanceOf(TProgress)
		expect(ring.aria.toObject()).toEqual(line.aria.toObject())
		expect(ring.dataset.toObject()).toEqual(line.dataset.toObject())
	})
})
