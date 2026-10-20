/**
 * ProgressLinear в Svelte — проводка на настоящей разметке.
 *
 * Долю, `aria-value*`, `data-indeterminate` и модификатор оси считает ядро
 * (`core/__tests__/progress-linear.spec.ts`), переходы и бег рисует тема
 * (`playground/vue/browser/progress-linear.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы, модификатор и доля — на корне, внутри одна
 * заливка без привязок. Сценарии — те же, что у Vue
 * (`progress-linear.spec.ts`); порядок доли среди стилей корня сторожит
 * `root-attributes.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { TProgressLinear } from '@soldy-ui/core'
import { ProgressLinear, type ProgressLinearProps } from '@soldy-ui/svelte'
import { mount } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Доля готового на корне; пустая строка — переменной нет. */
const percent = (root: HTMLElement) => root.style.getPropertyValue('--so-progress-linear-percent')

describe('первая отрисовка', () => {
	it('по умолчанию полоса пуста: доля 0, aria-valuenow="0", бега нет, ось горизонтальная', () => {
		const node = mount(ProgressLinear, {}).root()

		expect(node.localName).toBe('span')
		expect([...node.classList]).toEqual([
			'so-progress-linear',
			'so-progress-linear--size-normal',
			'so-progress-linear--horizontal',
		])
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('0%')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = mount(ProgressLinear, { value: 40, indeterminate: true }).root()

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(percent(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная на корне', () => {
		const node = mount(ProgressLinear, { value: 40, direction: 'rtl' }).root()

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('40%')
		// Бег в RTL тема зеркалит по атрибуту
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('вертикальная ось — модификатором на корне, без aria-orientation', () => {
		const node = mount(ProgressLinear, { value: 40, orientation: 'vertical' }).root()

		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(node.classList.contains('so-progress-linear--horizontal')).toBe(false)
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(percent(node)).toBe('40%')
	})

	it('размер и вариант — модификаторами на корне', () => {
		const node = mount(ProgressLinear, { size: 'lg', variant: 'brand' }).root()

		expect([...node.classList]).toEqual([
			'so-progress-linear',
			'so-progress-linear--size-lg',
			'so-progress-linear--variant-brand',
			'so-progress-linear--horizontal',
		])
	})

	it('внутри — одна заливка: span только с классом, без стиля и слотов', () => {
		const node = mount(ProgressLinear, {
			value: 40,
			// @ts-expect-error — слота нет: содержимое тип не принимает, а разметка не рисует
			children: createRawSnippet(() => ({ render: () => '<b>текст</b>' })),
		}).root()

		const children = [...node.children]

		expect(children).toHaveLength(1)
		expect(children[0].localName).toBe('span')
		expect(children[0].getAttributeNames()).toEqual(['class'])
		expect(children[0].className).toBe('so-progress-linear__range')
		// Содержимое роли `progressbar` скринридер не читает — слота нет
		expect(node.textContent).toBe('')
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 60 })
		const { root } = mount(ProgressLinear, props)

		expect(percent(root())).toBe('60%')

		props.indeterminate = true
		flushSync()

		expect(root().hasAttribute('aria-valuenow')).toBe(false)
		expect(root().dataset.indeterminate).toBe('true')
		expect(percent(root())).toBe('')

		props.indeterminate = false
		flushSync()

		expect(root().getAttribute('aria-valuenow')).toBe('60')
		expect(root().dataset.indeterminate).toBe('false')
		expect(percent(root())).toBe('60%')
	})

	it('снятый из разметки флаг — снова доля: умолчание флага — false', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 30, indeterminate: true })
		const { root } = mount(ProgressLinear, props)

		expect(root().dataset.indeterminate).toBe('true')
		expect(percent(root())).toBe('')

		props.indeterminate = undefined
		flushSync()

		expect(root().dataset.indeterminate).toBe('false')
		expect(percent(root())).toBe('30%')
	})

	it('снятое из разметки значение — пустая полоса: умолчание — 0', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 30 })
		const { root } = mount(ProgressLinear, props)

		expect(percent(root())).toBe('30%')

		props.value = undefined
		flushSync()

		expect(root().getAttribute('aria-valuenow')).toBe('0')
		expect(root().dataset.indeterminate).toBe('false')
		expect(percent(root())).toBe('0%')
	})

	it('смена оси меняет модификатор на корне, снятая — снова горизонталь', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 20 })
		const { root } = mount(ProgressLinear, props)

		props.orientation = 'vertical'
		flushSync()

		expect(root().classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(root().classList.contains('so-progress-linear--horizontal')).toBe(false)

		props.orientation = undefined
		flushSync()

		expect(root().classList.contains('so-progress-linear--horizontal')).toBe(true)
		expect(root().classList.contains('so-progress-linear--vertical')).toBe(false)
	})

	it('смена шкалы пересчитывает долю и aria-value*', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 60 })
		const { root } = mount(ProgressLinear, props)

		props.max = 200
		flushSync()

		expect(percent(root())).toBe('30%')
		expect(root().getAttribute('aria-valuemax')).toBe('200')

		props.min = 40
		flushSync()

		expect(percent(root())).toBe('12.5%')
		expect(root().getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', () => {
		const props = reactiveProps<ProgressLinearProps>({ value: 40 })
		const { root } = mount(ProgressLinear, props)

		props.visible = false
		flushSync()

		expect(root().style.display).toBe('none')
		expect(percent(root())).toBe('40%')

		props.visible = undefined
		flushSync()

		expect(root().style.display).toBe('')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const { root } = mount(ProgressLinear, { ctrl })

		expect(root().getAttribute('aria-valuenow')).toBe('25')
		expect(percent(root())).toBe('25%')

		ctrl.indeterminate = true
		flushSync()

		expect(root().dataset.indeterminate).toBe('true')
		expect(percent(root())).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		flushSync()

		expect(percent(root())).toBe('90%')

		ctrl.orientation = 'vertical'
		flushSync()

		expect(root().classList.contains('so-progress-linear--vertical')).toBe(true)
	})

	it('пропсы разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const { root } = mount(ProgressLinear, { ctrl, max: 50 })

		expect(ctrl.max).toBe(50)
		expect(percent(root())).toBe('50%')
	})

	it('бег и ось внешнего ctrl переживают монтирование без этих пропсов', () => {
		const ctrl = new TProgressLinear({
			value: 25,
			indeterminate: true,
			orientation: 'vertical',
		})
		const { root } = mount(ProgressLinear, { ctrl })

		expect(root().dataset.indeterminate).toBe('true')
		expect(root().classList.contains('so-progress-linear--vertical')).toBe(true)
	})
})

describe('имя', () => {
	it('без aria_label имени нет, а полоса не прячется', () => {
		const node = mount(ProgressLinear, { value: 40 }).root()

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', () => {
		const props = reactiveProps<ProgressLinearProps>({ aria_label: 'Загрузка файла' })
		const { root } = mount(ProgressLinear, props)

		expect(root().getAttribute('aria-label')).toBe('Загрузка файла')
		expect(root().getAttribute('role')).toBe('progressbar')

		props.aria_label = undefined
		props.aria_labelledBy = 'caption'
		flushSync()

		expect(root().hasAttribute('aria-label')).toBe(false)
		expect(root().getAttribute('aria-labelledby')).toBe('caption')
	})
})
