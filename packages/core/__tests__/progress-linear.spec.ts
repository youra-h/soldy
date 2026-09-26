import { describe, it, expect } from 'vitest'
import { TProgressLinear } from '@soldy-ui/core'
import type { IProgressLinearProps } from '@soldy-ui/core'

/**
 * TProgressLinear — индикатор выполнения линией: значение, шкала и то, что из
 * них следует для скринридера (`aria-value*`) и для темы (`data-indeterminate`
 * и доля CSS-переменной).
 *
 * Значение хранится как задано, границы действуют только в выходах: доля
 * прижата к 0–100 %, `aria-valuenow` — к шкале. Разметку проверяет
 * `ui/vue/__tests__/progress-linear.spec.ts`, переходы и бег темы — браузер
 * (`playground/vue/browser/progress-linear.spec.ts`).
 */

const progress = (props: Partial<IProgressLinearProps> = {}) => new TProgressLinear(props)

/** Доля готового, как её получает разметка. */
const percentOf = (instance: TProgressLinear) =>
	instance.percentStyle['--s-progress-linear-percent']

describe('умолчания', () => {
	it('доля неизвестна, шкала 0–100, корень — span с классом блока', () => {
		const instance = progress()

		expect(instance.value).toBeNull()
		expect(instance.min).toBe(0)
		expect(instance.max).toBe(100)
		expect(instance.tag).toBe('span')
		expect(instance.classes.toArray()).toContain('s-progress-linear')
		expect(instance.classes.toArray()).toContain('s-progress-linear--size-normal')
		expect(instance.getProps()).toMatchObject({ value: null, min: 0, max: 100 })
	})

	it('заданное — как задано, и в getProps тоже', () => {
		const instance = progress({ value: 7, min: 5, max: 10 })

		expect([instance.value, instance.min, instance.max]).toEqual([7, 5, 10])
		expect(instance.getProps()).toMatchObject({ value: 7, min: 5, max: 10 })
	})
})

describe('наборы: скринридеру и теме', () => {
	it('доля неизвестна — роль и шкала есть, aria-valuenow нет, data-indeterminate="true"', () => {
		const instance = progress()

		expect(instance.aria.toObject()).toEqual({
			role: 'progressbar',
			'aria-valuemin': '0',
			'aria-valuemax': '100',
		})
		expect(instance.dataset.get('data-indeterminate')).toBe('true')
		expect(instance.percentStyle).toEqual({})
	})

	it('доля известна — aria-valuenow и data-indeterminate="false"', () => {
		const instance = progress({ value: 40 })

		expect(instance.aria.toObject()).toEqual({
			role: 'progressbar',
			'aria-valuemin': '0',
			'aria-valuemax': '100',
			'aria-valuenow': '40',
		})
		expect(instance.dataset.get('data-indeterminate')).toBe('false')
		expect(instance.percentStyle).toEqual({ '--s-progress-linear-percent': '40%' })
	})

	it('смена значения переводит наборы туда и обратно', () => {
		const instance = progress()

		instance.value = 60

		expect(instance.aria.get('aria-valuenow')).toBe('60')
		expect(instance.dataset.get('data-indeterminate')).toBe('false')

		instance.value = null

		expect(instance.aria.has('aria-valuenow')).toBe(false)
		expect(instance.dataset.get('data-indeterminate')).toBe('true')
		expect(instance.percentStyle).toEqual({})
	})

	it('смена шкалы переписывает aria-valuemin и aria-valuemax', () => {
		const instance = progress({ value: 3 })

		instance.min = 1
		instance.max = 5

		expect(instance.aria.get('aria-valuemin')).toBe('1')
		expect(instance.aria.get('aria-valuemax')).toBe('5')
		expect(instance.aria.get('aria-valuenow')).toBe('3')
	})

	it('имени по умолчанию нет: его даёт плагин, а не ядро', () => {
		const instance = progress({ value: 40 })

		expect(instance.aria.has('aria-label')).toBe(false)
		expect(instance.aria.has('aria-labelledby')).toBe(false)
	})
})

describe('доля готового', () => {
	it('от min до max, с процентом', () => {
		expect(percentOf(progress({ value: 40 }))).toBe('40%')
		expect(percentOf(progress({ value: 0 }))).toBe('0%')
		expect(percentOf(progress({ value: 100 }))).toBe('100%')
		expect(percentOf(progress({ value: 15, min: 10, max: 20 }))).toBe('50%')
	})

	it('за границами — край, и у доли, и у aria-valuenow', () => {
		const below = progress({ value: -20 })
		const above = progress({ value: 140 })

		expect(percentOf(below)).toBe('0%')
		expect(below.aria.get('aria-valuenow')).toBe('0')
		expect(percentOf(above)).toBe('100%')
		expect(above.aria.get('aria-valuenow')).toBe('100')
	})

	it('значение хранится как задано: границы — только в выходах', () => {
		const instance = progress({ value: 140 })

		expect(instance.value).toBe(140)
		expect(instance.getProps().value).toBe(140)

		// Шкала выросла — значение, пришедшее раньше max, не потерялось
		instance.max = 200

		expect(percentOf(instance)).toBe('70%')
		expect(instance.aria.get('aria-valuenow')).toBe('140')
	})

	it('треть — без хвоста плавающей точки', () => {
		expect(percentOf(progress({ value: 1, max: 3 }))).toBe('33.3333%')
		expect(percentOf(progress({ value: 0.3, max: 1 }))).toBe('30%')
	})

	it('max не больше min — 0%, а aria-valuenow — min', () => {
		const empty = progress({ value: 50, min: 50, max: 50 })
		const reversed = progress({ value: 30, min: 50, max: 10 })

		expect(percentOf(empty)).toBe('0%')
		expect(percentOf(reversed)).toBe('0%')
		expect(reversed.aria.get('aria-valuenow')).toBe('50')
	})

	it('смена min и max пересчитывает долю', () => {
		const instance = progress({ value: 50 })

		instance.max = 200

		expect(percentOf(instance)).toBe('25%')
		expect(instance.aria.get('aria-valuenow')).toBe('50')

		instance.min = 40

		expect(percentOf(instance)).toBe('6.25%')
	})
})

describe('события — только на смену', () => {
	it('change:value, change:min и change:max: запись того же значения молчит', () => {
		const instance = progress({ value: 40 })
		const fired: string[] = []

		instance.events.on('change:value', (value) => fired.push(`value ${value}`))
		instance.events.on('change:min', (value) => fired.push(`min ${value}`))
		instance.events.on('change:max', (value) => fired.push(`max ${value}`))

		instance.value = 40
		instance.min = 0
		instance.max = 100

		expect(fired).toEqual([])

		instance.value = 50
		instance.value = null
		instance.value = null
		instance.min = 10
		instance.max = 90

		expect(fired).toEqual(['value 50', 'value null', 'min 10', 'max 90'])
	})

	it('change:aria и change:dataset — когда набор сменился', () => {
		const instance = progress({ value: 40 })
		let aria = 0
		let dataset = 0

		instance.events.on('change:aria', () => (aria += 1))
		instance.events.on('change:dataset', () => (dataset += 1))

		// Записали то же самое — наборы не тронуты
		instance.value = 40
		instance.max = 100

		expect([aria, dataset]).toEqual([0, 0])

		instance.value = 60

		expect([aria, dataset]).toEqual([1, 0])

		instance.value = null

		expect([aria, dataset]).toEqual([2, 1])
	})
})
