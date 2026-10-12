/**
 * `<span is="so-progress-spinner">` — проводка на настоящей разметке.
 *
 * Долю, `aria-value*` и `data-indeterminate` считает ядро
 * (`core/__tests__/progress-spinner.spec.ts`), рисунок, переходы и бег — тема
 * (`playground/vue/browser/progress-spinner.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы и доля — на корне, внутри один рисунок под
 * `aria-hidden` без привязок. Сценарии — те же, что у React
 * (`progress-spinner.spec.tsx`); порядок доли среди стилей корня сторожит
 * `root-attributes.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TProgressSpinner } from '@soldy-ui/core'
import { ProgressSpinnerDescriptor } from '@soldy-ui/setup'
import {
	TProgressSpinnerElement,
	toAttributeName,
	type TProgressSpinnerElementProps,
} from '@soldy-ui/webc'
import { progressSpinnerTemplate } from '../src/components/progress-spinner/progress-spinner.template'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Доля готового на корне; пустая строка — переменной нет. */
const fraction = (root: HTMLElement) => root.style.getPropertyValue('--s-progress-spinner-fraction')

function isSpinner(node: Element | null): node is TProgressSpinnerElementProps {
	return node instanceof TProgressSpinnerElement
}

/** Кольцо из разметки; узел другой — тест падает здесь. */
function mount(html: string): TProgressSpinnerElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-progress-spinner"]')

	if (!isSpinner(node)) throw new Error('<span is="so-progress-spinner"> нет')

	return node
}

/** Кольцо над готовым инстансом: `ctrl` выставлен до подключения, атрибуты — тоже. */
function mountCtrl(
	ctrl: TProgressSpinner,
	attributes: Record<string, string> = {},
): TProgressSpinnerElementProps {
	const node = document.createElement('span', { is: 'so-progress-spinner' })

	if (!isSpinner(node)) throw new Error('<span is="so-progress-spinner"> нет')

	for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('первая отрисовка', () => {
	it('по умолчанию кольцо пусто: доля 0, aria-valuenow="0", бега нет', () => {
		const node = mount('<span is="so-progress-spinner"></span>')

		expect(node).toBeInstanceOf(HTMLSpanElement)
		expect([...node.classList]).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-normal',
		])
		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemin')).toBe('0')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.hasAttribute('aria-hidden')).toBe(false)
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0')
	})

	it('тег у ядра — тег элемента: span', () => {
		const ctrl = new TProgressSpinner()

		mountCtrl(ctrl)

		expect(ctrl.tag).toBe('span')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = mount('<span is="so-progress-spinner" value="40" indeterminate></span>')

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная числом на корне', () => {
		const node = mount('<span is="so-progress-spinner" value="40" direction="rtl"></span>')

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0.4')
		// Кольцо в RTL не зеркалится, но направление письма доходит до корня,
		// как у любого компонента
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('размер и вариант — модификаторами на корне', () => {
		const node = mount('<span is="so-progress-spinner" size="lg" variant="brand"></span>')

		expect([...node.classList]).toEqual([
			's-progress-spinner',
			's-progress-spinner--size-lg',
			's-progress-spinner--variant-brand',
		])
	})

	it('внутри — один рисунок под aria-hidden: дорожка и две дуги без привязок, слотов нет', () => {
		const node = mount('<span is="so-progress-spinner" value="40">текст</span>')
		const children = [...node.children]

		expect(children).toHaveLength(1)

		const [ring] = children

		expect(ring).toBeInstanceOf(SVGSVGElement)
		expect(ring.getAttribute('class')).toBe('s-progress-spinner__ring')
		expect(ring.getAttribute('aria-hidden')).toBe('true')
		expect(ring.getAttributeNames().sort()).toEqual(['aria-hidden', 'class', 'viewBox'])
		expect([...ring.children].map((circle) => circle.getAttribute('class'))).toEqual([
			's-progress-spinner__track',
			's-progress-spinner__range',
			's-progress-spinner__runner',
		])
		// Геометрия статична: доля уходит в штрих из переменной корня, а не
		// привязкой на дуге
		expect([...ring.children].map((circle) => circle.getAttributeNames().sort())).toEqual([
			['class', 'cx', 'cy', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
			['class', 'cx', 'cy', 'pathLength', 'r'],
		])
		// Содержимое роли `progressbar` скринридер не читает — слота нет, и
		// написанное внутри элемента не выводится
		expect(node.textContent).toBe('')
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — ни одного', () => {
		const targets = progressSpinnerTemplate.create(document.createElement('span'))

		expect(Object.keys(targets)).toEqual(
			ProgressSpinnerDescriptor().slots.map((slot) => slot.name),
		)
		expect(Object.keys(targets)).toEqual([])
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', async () => {
		const node = mount('<span is="so-progress-spinner" value="60"></span>')

		expect(fraction(node)).toBe('0.6')

		node.indeterminate = true
		await flush()

		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')

		node.indeterminate = false
		await flush()

		expect(node.getAttribute('aria-valuenow')).toBe('60')
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0.6')
	})

	it('снятый атрибут флага — снова доля: умолчание флага — false', async () => {
		const node = mount('<span is="so-progress-spinner" value="30" indeterminate></span>')

		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')

		node.removeAttribute('indeterminate')
		await flush()

		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0.3')
	})

	it('снятый атрибут значения — пустое кольцо: умолчание — 0', async () => {
		const node = mount('<span is="so-progress-spinner" value="30"></span>')

		expect(fraction(node)).toBe('0.3')

		node.removeAttribute('value')
		await flush()

		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.dataset.indeterminate).toBe('false')
		expect(fraction(node)).toBe('0')
	})

	it('смена шкалы пересчитывает долю и aria-value*', async () => {
		const node = mount('<span is="so-progress-spinner" value="60"></span>')

		node.max = 200
		await flush()

		expect(fraction(node)).toBe('0.3')
		expect(node.getAttribute('aria-valuemax')).toBe('200')

		node.min = 40
		await flush()

		expect(fraction(node)).toBe('0.125')
		expect(node.getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', async () => {
		const node = mount('<span is="so-progress-spinner" value="40"></span>')

		node.visible = false
		await flush()

		expect(node.style.display).toBe('none')
		expect(fraction(node)).toBe('0.4')

		node.visible = true
		await flush()

		expect(node.style.display).toBe('')
		expect(fraction(node)).toBe('0.4')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', async () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const node = mountCtrl(ctrl)

		expect(node.getAttribute('aria-valuenow')).toBe('25')
		expect(fraction(node)).toBe('0.25')

		ctrl.indeterminate = true
		await flush()

		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		await flush()

		expect(fraction(node)).toBe('0.9')
	})

	it('атрибуты разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressSpinner({ value: 25 })
		const node = mountCtrl(ctrl, { max: '50' })

		expect(ctrl.max).toBe(50)
		expect(fraction(node)).toBe('0.5')
	})

	it('бег внешнего ctrl переживает подключение без этого атрибута', () => {
		const ctrl = new TProgressSpinner({ value: 25, indeterminate: true })
		const node = mountCtrl(ctrl)

		expect(node.dataset.indeterminate).toBe('true')
		expect(fraction(node)).toBe('')
	})
})

/**
 * Имя — пропы плагина доступного имени. Атрибут пропа — его имя в
 * kebab-case (`toAttributeName`): `aria_labelledBy` пишется
 * `aria_labelled-by`.
 */
describe('имя', () => {
	it('без aria_label имени нет, а кольцо не прячется', () => {
		const node = mount('<span is="so-progress-spinner" value="40"></span>')

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', async () => {
		const node = mount('<span is="so-progress-spinner" aria_label="Загрузка файла"></span>')

		expect(node.getAttribute('aria-label')).toBe('Загрузка файла')
		expect(node.getAttribute('role')).toBe('progressbar')

		node.removeAttribute('aria_label')
		node.setAttribute(toAttributeName('aria_labelledBy'), 'caption')
		await flush()

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.getAttribute('aria-labelledby')).toBe('caption')
	})
})
