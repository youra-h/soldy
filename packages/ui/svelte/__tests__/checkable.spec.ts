/**
 * CheckBox и Switch в Svelte: корень, вложенный `<input type="checkbox">` и
 * декор — коробка с отметкой или дорожка с ручкой.
 *
 * Сценарии — те же, что у React (`checkable.spec.tsx`) и Vue
 * (`input-control-attrs.spec.ts`, `input-bool.spec.ts`). Наборы ядра стоят на
 * разных элементах: `attrs` (`dir`) — на корне, `aria` — на `<input>`;
 * нативные `disabled` и `required` поля без ARIA-дублей, `readonly` — только
 * `aria-readonly`: HTML не знает его у чекбокса. Контрол кладут в подпись
 * `Label`, поэтому корень — `span`, а декор скрыт `aria-hidden`: всё внутри
 * `label` входит в имя поля.
 *
 * Отметку и «выбрано частично» сообщают нативные `checked` и `indeterminate` —
 * Svelte пишет их свойствами узла. Переключает значение `TInputBoolPlugin` по
 * `change` поля, его слушатели встают по `ready` — кадром позже. Серверная
 * разметка — `checkable.server.spec.ts`.
 *
 * Метки блоков Svelte — комментарии — в разметке остаются, и пустоту коробки
 * и ручки тест видит так, как её видит тема: без них (`contentOf`).
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { TCheckBox, TSwitch, type ISwitch } from '@soldy-ui/core'
import { setIcons, type TIconSource } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { CheckBox, Switch, type CheckBoxProps, type SwitchProps } from '@soldy-ui/svelte'
import { contentOf, find, htmlOf, mount, nextFrame, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня. */
const field = (root: HTMLElement) => find(root, 'input', HTMLInputElement)

/** Клик по полю — браузер переключает его и шлёт `change`. */
function click(input: HTMLInputElement): void {
	input.click()
	flushSync()
}

/**
 * Пропсы, общие у CheckBox и Switch. Атрибут `data-*` — отдельно: у
 * атрибутов он шаблонный ключ, и `Pick` сделал бы его обязательным.
 */
type TCheckableProps = Pick<
	CheckBoxProps & SwitchProps,
	| 'value'
	| 'disabled'
	| 'required'
	| 'readonly'
	| 'tag'
	| 'direction'
	| 'aria_label'
	| 'class'
	| 'style'
	| 'onChangeValue'
> & { 'data-testid'?: string }

/**
 * Инстанс и компонент строятся в одной записи таблицы. Разнесённые по
 * столбцам, они стали бы независимыми объединениями, и `TCheckBox` уходил бы
 * в `ctrl` компонента `Switch`.
 */
const CHECKABLES = [
	[
		'CheckBox',
		{
			decor: '.s-check-box__container',
			render: (props: TCheckableProps = {}): TMounted => mount(CheckBox, props),
			withCtrl: (readonly = false) => {
				const ctrl = new TCheckBox({ readonly })

				return { ctrl, view: mount(CheckBox, { ctrl }) }
			},
		},
	],
	[
		'Switch',
		{
			decor: '.s-switch__track',
			render: (props: TCheckableProps = {}): TMounted => mount(Switch, props),
			withCtrl: (readonly = false) => {
				const ctrl = new TSwitch({ readonly })

				return { ctrl, view: mount(Switch, { ctrl }) }
			},
		},
	],
] as const

describe.each(CHECKABLES)('%s · разметка', (_name, { decor, render }) => {
	/**
	 * Контрол кладут в подпись `Label`, а внутри `label` HTML разрешает только
	 * строчную разметку: `div` там невалиден.
	 */
	it('корень — span по умолчанию, и всё внутри — не div', () => {
		const el = render().root()

		expect(el.localName).toBe('span')
		expect(el.querySelectorAll('div')).toHaveLength(0)
	})

	it('корень рисуется по tag', () => {
		expect(render({ tag: 'div' }).root().localName).toBe('div')
	})

	/**
	 * Имя контролу даёт подпись вокруг, и в него вошёл бы весь текст внутри
	 * `label`, включая слоты иконок и `on`/`off`. Декор из имени убран.
	 */
	it('декор скрыт от скринридера — aria-hidden', () => {
		const el = render({ value: true }).root()

		expect(find(el, decor, HTMLElement).getAttribute('aria-hidden')).toBe('true')
	})

	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(render({ disabled: true, required: true }).root())

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — aria-readonly на <input>: HTML не знает readonly у чекбокса', () => {
		const input = field(render({ readonly: true }).root())

		expect(input.getAttribute('aria-readonly')).toBe('true')
		expect(input.hasAttribute('readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(render({ disabled: true }).root().hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = render({ direction: 'rtl' }).root()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('aria_label доходит до <input>', () => {
		const input = field(render({ aria_label: 'Согласие' }).root())

		expect(input.getAttribute('aria-label')).toBe('Согласие')
	})

	it.each([true, false])('value: %s — нативный checked у <input>, без aria-checked', (value) => {
		const input = field(render({ value }).root())

		expect(input.checked).toBe(value)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена value доходит до checked в обе стороны', () => {
		const props = reactiveProps<TCheckableProps>({})
		const { root } = render(props)

		props.value = true
		flushSync()

		expect(field(root()).checked).toBe(true)

		props.value = false
		flushSync()

		expect(field(root()).checked).toBe(false)
	})

	it('класс и стиль — на корне, прочие атрибуты — на поле', () => {
		const el = render({
			class: 'app-control',
			style: 'color: red',
			'data-testid': 'field',
		}).root()

		expect(el.classList.contains('app-control')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(el.hasAttribute('data-testid')).toBe(false)
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('style')).toBe(false)
		expect(field(el).getAttribute('data-testid')).toBe('field')
	})
})

describe.each(CHECKABLES)('%s · клик', (_name, { render, withCtrl }) => {
	it('переключает DOM и модель', async () => {
		const { ctrl, view } = withCtrl()
		const input = field(view.root())

		await nextFrame()
		click(input)

		expect(input.checked).toBe(true)
		expect(ctrl.value).toBe(true)
	})

	it('один клик — одно onChangeValue', async () => {
		const onChangeValue = vi.fn()
		const input = field(render({ onChangeValue }).root())

		await nextFrame()
		click(input)

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: true, oldValue: false }]])
	})

	it('readonly — клик отменён: DOM и модель не меняются', async () => {
		const { ctrl, view } = withCtrl(true)
		const input = field(view.root())

		await nextFrame()
		click(input)

		expect(input.checked).toBe(false)
		expect(ctrl.value).toBe(false)
	})

	/**
	 * После клика отметка узла — уже его собственная, и атрибут `checked` её
	 * не меняет. Значение из кода доходит свойством.
	 */
	it('ctrl.value из кода после клика — в DOM', async () => {
		const { ctrl, view } = withCtrl()
		const input = field(view.root())

		await nextFrame()
		click(input)

		ctrl.value = false
		flushSync()

		expect(input.checked).toBe(false)
	})
})

describe('CheckBox · indeterminate', () => {
	it('DOM-свойство <input>, а не aria-checked="mixed"', () => {
		const input = field(mount(CheckBox, { indeterminate: true }).root())

		expect(input.indeterminate).toBe(true)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена пропа доходит до свойства в обе стороны', () => {
		const props = reactiveProps<CheckBoxProps>({})
		const { root } = mount(CheckBox, props)

		expect(field(root()).indeterminate).toBe(false)

		props.indeterminate = true
		flushSync()

		expect(field(root()).indeterminate).toBe(true)

		props.indeterminate = false
		flushSync()

		expect(field(root()).indeterminate).toBe(false)
	})

	it('клик снимает indeterminate и отмечает', async () => {
		const ctrl = new TCheckBox({ indeterminate: true })
		const input = field(mount(CheckBox, { ctrl }).root())

		await nextFrame()
		click(input)

		expect(input.indeterminate).toBe(false)
		expect(input.checked).toBe(true)
		expect(ctrl.indeterminate).toBe(false)
		expect(ctrl.value).toBe(true)
	})

	it('клик не снимает indeterminate у readonly', async () => {
		const ctrl = new TCheckBox({ indeterminate: true, readonly: true })
		const input = field(mount(CheckBox, { ctrl }).root())

		await nextFrame()
		click(input)

		expect(input.indeterminate).toBe(true)
		expect(ctrl.indeterminate).toBe(true)
	})
})

/** Содержимое `<svg>` иконки так, как его сериализует документ. */
function bodyOf(source: TIconSource): string {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

	svg.innerHTML = source.body

	return svg.innerHTML
}

/** Scope слотов отметки. */
type TMarkScope = { value: boolean | undefined; indeterminate: boolean }

/** Слот отметки: печатает то, что пришло в scope. */
const scopeMark = createRawSnippet((scope: () => TMarkScope) => ({
	render: () => `<b>${scope().value}/${scope().indeterminate}</b>`,
}))

describe('CheckBox · отметка', () => {
	/** Отметка — в коробке: иконка или содержимое слота. */
	const mark = (root: HTMLElement) => find(root, '.s-check-box__container', HTMLElement)

	it('выбранный — иконка из пакета по роли check', () => {
		const svg = find(mark(mount(CheckBox, { value: true }).root()), 'svg', SVGSVGElement)

		expect(svg.getAttribute('viewBox')).toBe(material.check.viewBox)
		expect(svg.innerHTML).toBe(bodyOf(material.check))
		expect(svg.classList.contains('s-check-box__mark')).toBe(true)
	})

	it('частично выбранный — иконка по роли checkIndeterminate, и поверх значения', () => {
		const svg = find(
			mark(mount(CheckBox, { value: true, indeterminate: true }).root()),
			'svg',
			SVGSVGElement,
		)

		expect(svg.innerHTML).toBe(bodyOf(material.checkIndeterminate))
	})

	it('невыбранный — коробка пуста', () => {
		expect(contentOf(mark(mount(CheckBox, {}).root()))).toEqual([])
	})

	/**
	 * Отметка — `svg` роли, а не компонент Icon: тот собирал бы свой контекст и
	 * плагины на каждую смену отметки, в таблице — тысячами. У Icon корень
	 * всегда с классом `s-icon`, у отметки его нет; размер ей даёт тема флажка.
	 */
	it('отметка — не компонент Icon, и на смену отметки Icon не собирается', () => {
		const props = reactiveProps<CheckBoxProps>({ value: true })
		const { root } = mount(CheckBox, props)

		props.indeterminate = true
		flushSync()
		props.indeterminate = false
		props.value = false
		flushSync()
		props.value = true
		props.size = 'lg'
		flushSync()

		const svg = find(mark(root()), 'svg', SVGSVGElement)

		expect(svg.classList.contains('s-check-box__mark')).toBe(true)
		expect(root().querySelector('.s-icon')).toBeNull()
	})

	it('иконка переживает перерисовку — тот же узел', () => {
		const props = reactiveProps<CheckBoxProps>({ value: true })
		const { root } = mount(CheckBox, props)
		const svg = find(mark(root()), 'svg', SVGSVGElement)

		props.size = 'lg'
		flushSync()

		expect(find(mark(root()), 'svg', SVGSVGElement)).toBe(svg)
	})

	/**
	 * Роль читается на отрисовке отметки, а не при сборке флажка: пакет,
	 * подключённый позже, виден у отметки, нарисованной после него. Отметку,
	 * которая уже стоит, Svelte не перерисовывает без смены её состояния.
	 */
	it('иконка по роли — из пакета на момент отрисовки', () => {
		const custom: TIconSource = { viewBox: '0 0 10 10', body: '<circle r="5"></circle>' }
		const props = reactiveProps<CheckBoxProps>({})
		const { root } = mount(CheckBox, props)

		try {
			setIcons({ check: custom })
			props.value = true
			flushSync()

			const svg = find(mark(root()), 'svg', SVGSVGElement)

			expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
			expect(svg.innerHTML).toBe(bodyOf(custom))
		} finally {
			setIcons(material)
		}
	})

	it('слот icon подменяет иконку и получает scope', () => {
		const el = mount(CheckBox, { value: true, icon: scopeMark }).root()

		expect(htmlOf(mark(el))).toBe('<b>true/false</b>')
	})

	it('слот indeterminate-icon подменяет иконку частично выбранного', () => {
		const el = mount(CheckBox, { indeterminate: true, 'indeterminate-icon': scopeMark }).root()

		expect(htmlOf(mark(el))).toBe('<b>false/true</b>')
	})

	it('слоты — не атрибуты поля', () => {
		const input = field(mount(CheckBox, { value: true, icon: scopeMark }).root())

		expect(input.hasAttribute('icon')).toBe(false)
	})
})

describe('Switch · роль и ручка', () => {
	/** Содержимое ручки. */
	const thumb = (root: HTMLElement) => find(root, '.s-switch__track--thumb', HTMLElement)

	/** Содержимое слота без scope. */
	const markup = (html: string) => createRawSnippet(() => ({ render: () => html }))

	it('role="switch" на <input>, а не на корне', () => {
		const el = mount(Switch, {}).root()

		expect(field(el).getAttribute('role')).toBe('switch')
		expect(el.hasAttribute('role')).toBe(false)
	})

	it('в ручке — слот off у выключенного и on у включённого', () => {
		const ctrl = new TSwitch()
		const el = mount(Switch, {
			ctrl,
			on: markup('<i>вкл</i>'),
			off: markup('<i>выкл</i>'),
		}).root()

		expect(htmlOf(thumb(el))).toBe('<i>выкл</i>')

		ctrl.value = true
		flushSync()

		expect(htmlOf(thumb(el))).toBe('<i>вкл</i>')
	})

	it('слоты получают scope — значение и инстанс', () => {
		const ctrl = new TSwitch({ value: true })
		const on = createRawSnippet(
			(scope: () => { value: boolean | undefined; ctrl: ISwitch }) => ({
				render: () => `<i>${scope().value}:${scope().ctrl === ctrl}</i>`,
			}),
		)

		expect(htmlOf(thumb(mount(Switch, { ctrl, on }).root()))).toBe('<i>true:true</i>')
	})

	it('без слотов ручка пуста', () => {
		expect(contentOf(thumb(mount(Switch, {}).root()))).toEqual([])
	})
})
