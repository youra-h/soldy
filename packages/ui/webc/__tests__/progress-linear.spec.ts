/**
 * `<span is="so-progress-linear">` — проводка на настоящей разметке.
 *
 * Долю, `aria-value*`, `data-indeterminate` и модификатор оси считает ядро
 * (`core/__tests__/progress-linear.spec.ts`), переходы и бег рисует тема
 * (`playground/vue/browser/progress-linear.spec.ts`). Здесь важно, что всё это
 * доезжает до разметки: наборы, модификатор и доля — на корне, внутри одна
 * заливка без привязок. Сценарии — те же, что у Vue (`progress-linear.spec.ts`);
 * порядок доли среди стилей корня сторожит `root-attributes.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TProgressLinear } from '@soldy-ui/core'
import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import {
	TProgressLinearElement,
	toAttributeName,
	type TProgressLinearElementProps,
} from '@soldy-ui/webc'
import { progressLinearTemplate } from '../src/components/progress-linear/progress-linear.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Доля готового на корне; пустая строка — переменной нет. */
const percent = (root: HTMLElement) => root.style.getPropertyValue('--so-progress-linear-percent')

function isLine(node: Element | null): node is TProgressLinearElementProps {
	return node instanceof TProgressLinearElement
}

/** Полоса из разметки; узел другой — тест падает здесь. */
function mount(html: string): TProgressLinearElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-progress-linear"]')

	if (!isLine(node)) throw new Error('<span is="so-progress-linear"> нет')

	return node
}

/** Полоса над готовым инстансом: `ctrl` выставлен до подключения, атрибуты — тоже. */
function mountCtrl(
	ctrl: TProgressLinear,
	attributes: Record<string, string> = {},
): TProgressLinearElementProps {
	const node = document.createElement('span', { is: 'so-progress-linear' })

	if (!isLine(node)) throw new Error('<span is="so-progress-linear"> нет')

	for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)

	node.ctrl = ctrl
	document.body.appendChild(node)

	return node
}

afterEach(() => {
	document.body.innerHTML = ''
})

describe('первая отрисовка', () => {
	it('по умолчанию полоса пуста: доля 0, aria-valuenow="0", бега нет, ось горизонтальная', () => {
		const node = mount('<span is="so-progress-linear"></span>')

		expect(node).toBeInstanceOf(HTMLSpanElement)
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

	it('тег у ядра — тег элемента: span', () => {
		const ctrl = new TProgressLinear()

		mountCtrl(ctrl)

		expect(ctrl.tag).toBe('span')
	})

	it('флаг из разметки: роль и шкала без aria-valuenow, бег, переменной нет', () => {
		const node = mount('<span is="so-progress-linear" value="40" indeterminate></span>')

		expect(node.getAttribute('role')).toBe('progressbar')
		expect(node.getAttribute('aria-valuemax')).toBe('100')
		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(percent(node)).toBe('')
		// Пустой стиль-выход атрибута не оставляет
		expect(node.hasAttribute('style')).toBe(false)
	})

	it('доля известна: aria-valuenow, data-indeterminate="false" и переменная на корне', () => {
		const node = mount('<span is="so-progress-linear" value="40" direction="rtl"></span>')

		expect(node.getAttribute('aria-valuenow')).toBe('40')
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('40%')
		// Бег в RTL тема зеркалит по атрибуту
		expect(node.getAttribute('dir')).toBe('rtl')
	})

	it('вертикальная ось — модификатором на корне, без aria-orientation', () => {
		const node = mount(
			'<span is="so-progress-linear" value="40" orientation="vertical"></span>',
		)

		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(node.classList.contains('so-progress-linear--horizontal')).toBe(false)
		expect(node.hasAttribute('aria-orientation')).toBe(false)
		expect(percent(node)).toBe('40%')
	})

	it('внутри — одна заливка: span только с классом, без стиля; написанное внутри не выводится', () => {
		const node = mount('<span is="so-progress-linear" value="40">текст</span>')
		const children = [...node.children]

		expect(children).toHaveLength(1)
		expect(children[0].localName).toBe('span')
		expect(children[0].getAttributeNames()).toEqual(['class'])
		expect(children[0].className).toBe('so-progress-linear__range')
		// Содержимое роли `progressbar` скринридер не читает — слота нет
		expect(node.textContent).toBe('')
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор, — ни одного', () => {
		const root = document.createElement('span')
		const targets = progressLinearTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(
			ProgressLinearDescriptor().slots.map((slot) => slot.name),
		)
		expect(Object.keys(targets)).toEqual([])
	})
})

describe('смена значения и флага', () => {
	it('флаг поверх значения и обратно: после снятия снова видна доля', async () => {
		const node = mount('<span is="so-progress-linear" value="60"></span>')

		expect(percent(node)).toBe('60%')

		node.indeterminate = true
		await flush()

		expect(node.hasAttribute('aria-valuenow')).toBe(false)
		expect(node.dataset.indeterminate).toBe('true')
		expect(percent(node)).toBe('')

		node.indeterminate = false
		await flush()

		expect(node.getAttribute('aria-valuenow')).toBe('60')
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('60%')
	})

	it('снятый атрибут флага — снова доля: умолчание флага — false', async () => {
		const node = mount('<span is="so-progress-linear" value="30" indeterminate></span>')

		node.removeAttribute('indeterminate')
		await flush()

		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('30%')
	})

	it('снятый атрибут значения — пустая полоса: умолчание — 0', async () => {
		const node = mount('<span is="so-progress-linear" value="30"></span>')

		node.removeAttribute('value')
		await flush()

		expect(node.getAttribute('aria-valuenow')).toBe('0')
		expect(node.dataset.indeterminate).toBe('false')
		expect(percent(node)).toBe('0%')
	})

	it('смена оси меняет модификатор на корне, снятый атрибут — снова горизонталь', async () => {
		const node = mount('<span is="so-progress-linear" value="20"></span>')

		node.orientation = 'vertical'
		await flush()

		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
		expect(node.classList.contains('so-progress-linear--horizontal')).toBe(false)

		node.orientation = undefined
		await flush()

		expect(node.classList.contains('so-progress-linear--horizontal')).toBe(true)
		expect(node.classList.contains('so-progress-linear--vertical')).toBe(false)
	})

	it('смена шкалы пересчитывает долю и aria-value*', async () => {
		const node = mount('<span is="so-progress-linear" value="60"></span>')

		node.max = 200
		await flush()

		expect(percent(node)).toBe('30%')
		expect(node.getAttribute('aria-valuemax')).toBe('200')

		node.min = 40
		await flush()

		expect(percent(node)).toBe('12.5%')
		expect(node.getAttribute('aria-valuemin')).toBe('40')
	})

	it('скрытый корень — display: none, доля остаётся на нём', async () => {
		const node = mount('<span is="so-progress-linear" value="40"></span>')

		node.visible = false
		await flush()

		expect(node.style.display).toBe('none')
		expect(percent(node)).toBe('40%')

		node.visible = true
		await flush()

		expect(node.style.display).toBe('')
		expect(percent(node)).toBe('40%')
	})
})

describe('внешний ctrl', () => {
	it('разметка — по его значению, смена у экземпляра доезжает', async () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const node = mountCtrl(ctrl)

		expect(node.getAttribute('aria-valuenow')).toBe('25')
		expect(percent(node)).toBe('25%')

		ctrl.indeterminate = true
		await flush()

		expect(node.dataset.indeterminate).toBe('true')
		expect(percent(node)).toBe('')

		ctrl.value = 90
		ctrl.indeterminate = false
		await flush()

		expect(percent(node)).toBe('90%')

		ctrl.orientation = 'vertical'
		await flush()

		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
	})

	it('атрибуты разметки ложатся поверх ctrl', () => {
		const ctrl = new TProgressLinear({ value: 25 })
		const node = mountCtrl(ctrl, { max: '50' })

		expect(ctrl.max).toBe(50)
		expect(percent(node)).toBe('50%')
	})

	it('бег и ось внешнего ctrl переживают подключение без этих атрибутов', () => {
		const ctrl = new TProgressLinear({
			value: 25,
			indeterminate: true,
			orientation: 'vertical',
		})
		const node = mountCtrl(ctrl)

		expect(node.dataset.indeterminate).toBe('true')
		expect(node.classList.contains('so-progress-linear--vertical')).toBe(true)
	})
})

/**
 * Имя — пропы плагина доступного имени. Атрибут пропа — его имя в
 * kebab-case (`toAttributeName`): `aria_labelledBy` пишется
 * `aria_labelled-by`.
 */
describe('имя', () => {
	it('без aria_label имени нет, а полоса не прячется', () => {
		const node = mount('<span is="so-progress-linear" value="40"></span>')

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.hasAttribute('aria-hidden')).toBe(false)
	})

	it('aria_label и aria_labelledBy доходят до корня рядом с ролью', async () => {
		const node = mount('<span is="so-progress-linear" aria_label="Загрузка файла"></span>')

		expect(node.getAttribute('aria-label')).toBe('Загрузка файла')
		expect(node.getAttribute('role')).toBe('progressbar')

		node.removeAttribute('aria_label')
		node.setAttribute(toAttributeName('aria_labelledBy'), 'caption')
		await flush()

		expect(node.hasAttribute('aria-label')).toBe(false)
		expect(node.getAttribute('aria-labelledby')).toBe('caption')
	})
})
