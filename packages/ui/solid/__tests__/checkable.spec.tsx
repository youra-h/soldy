/**
 * CheckBox и Switch в Solid: корень, вложенный `<input type="checkbox">` и
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
 * Solid пишет их свойствами узла. Переключает значение `TInputBoolPlugin` по
 * `change` поля, его слушатели встают по `ready` — кадром позже. Серверная
 * разметка — `checkable.server.spec.tsx`.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import { TCheckBox, TSwitch, type ISwitch } from '@soldy-ui/core'
import { setIcons, type TIconSource } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import { CheckBox, Switch, type CheckBoxProps, type SwitchProps } from '@soldy-ui/solid'
import { find, mount, nextFrame, type TMounted } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня. */
const field = (root: HTMLElement) => find(root, 'input', HTMLInputElement)

/** Пропсы, общие у CheckBox и Switch. */
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
>

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
			render: (props: () => TCheckableProps = () => ({})): TMounted =>
				mount(() => <CheckBox {...props()} />),
			withCtrl: (readonly = false) => {
				const ctrl = new TCheckBox({ readonly })

				return { ctrl, view: mount(() => <CheckBox ctrl={ctrl} />) }
			},
		},
	],
	[
		'Switch',
		{
			decor: '.s-switch__track',
			render: (props: () => TCheckableProps = () => ({})): TMounted =>
				mount(() => <Switch {...props()} />),
			withCtrl: (readonly = false) => {
				const ctrl = new TSwitch({ readonly })

				return { ctrl, view: mount(() => <Switch ctrl={ctrl} />) }
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
		expect(render(() => ({ tag: 'div' })).root().localName).toBe('div')
	})

	/**
	 * Имя контролу даёт подпись вокруг, и в него вошёл бы весь текст внутри
	 * `label`, включая слоты иконок и `on`/`off`. Декор из имени убран.
	 */
	it('декор скрыт от скринридера — aria-hidden', () => {
		const el = render(() => ({ value: true })).root()

		expect(find(el, decor, HTMLElement).getAttribute('aria-hidden')).toBe('true')
	})

	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(render(() => ({ disabled: true, required: true })).root())

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — aria-readonly на <input>: HTML не знает readonly у чекбокса', () => {
		const input = field(render(() => ({ readonly: true })).root())

		expect(input.getAttribute('aria-readonly')).toBe('true')
		expect(input.hasAttribute('readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(
			render(() => ({ disabled: true }))
				.root()
				.hasAttribute('disabled'),
		).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = render(() => ({ direction: 'rtl' })).root()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('aria_label доходит до <input>', () => {
		const input = field(render(() => ({ aria_label: 'Согласие' })).root())

		expect(input.getAttribute('aria-label')).toBe('Согласие')
	})

	it.each([true, false])('value: %s — нативный checked у <input>, без aria-checked', (value) => {
		const input = field(render(() => ({ value })).root())

		expect(input.checked).toBe(value)
		expect(input.hasAttribute('aria-checked')).toBe(false)
	})

	it('смена value доходит до checked в обе стороны', () => {
		const [value, setValue] = createSignal<boolean | undefined>(undefined)
		const { root } = render(() => ({ value: value() }))

		setValue(true)

		expect(field(root()).checked).toBe(true)

		setValue(false)

		expect(field(root()).checked).toBe(false)
	})

	it('класс и стиль — на корне, прочие атрибуты — на поле', () => {
		const el = render(() => ({ class: 'app-control', style: { color: 'red' } })).root()

		expect(el.classList.contains('app-control')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('style')).toBe(false)
	})
})

describe.each(CHECKABLES)('%s · клик', (_name, { render, withCtrl }) => {
	it('переключает DOM и модель', async () => {
		const { ctrl, view } = withCtrl()
		const input = field(view.root())

		await nextFrame()
		input.click()

		expect(input.checked).toBe(true)
		expect(ctrl.value).toBe(true)
	})

	it('один клик — одно onChangeValue', async () => {
		const onChangeValue = vi.fn()
		const input = field(render(() => ({ onChangeValue })).root())

		await nextFrame()
		input.click()

		expect(onChangeValue.mock.calls).toEqual([[{ newValue: true, oldValue: false }]])
	})

	it('readonly — клик отменён: DOM и модель не меняются', async () => {
		const { ctrl, view } = withCtrl(true)
		const input = field(view.root())

		await nextFrame()
		input.click()

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
		input.click()

		ctrl.value = false

		expect(input.checked).toBe(false)
	})
})

describe('CheckBox · indeterminate', () => {
	it('DOM-свойство <input>, а не aria-checked="mixed"', () => {
		const input = field(mount(() => <CheckBox indeterminate />).root())

		expect(input.indeterminate).toBe(true)
		expect(input.hasAttribute('aria-checked')).toBe(false)
		// Свойство, а не атрибут: у HTML атрибута `indeterminate` нет
		expect(input.hasAttribute('indeterminate')).toBe(false)
	})

	it('смена пропа доходит до свойства в обе стороны', () => {
		const [indeterminate, setIndeterminate] = createSignal<boolean | undefined>(undefined)
		const { root } = mount(() => <CheckBox indeterminate={indeterminate()} />)

		expect(field(root()).indeterminate).toBe(false)

		setIndeterminate(true)

		expect(field(root()).indeterminate).toBe(true)

		setIndeterminate(false)

		expect(field(root()).indeterminate).toBe(false)
	})

	it('клик снимает indeterminate и отмечает', async () => {
		const ctrl = new TCheckBox({ indeterminate: true })
		const input = field(mount(() => <CheckBox ctrl={ctrl} />).root())

		await nextFrame()
		input.click()

		expect(input.indeterminate).toBe(false)
		expect(input.checked).toBe(true)
		expect(ctrl.indeterminate).toBe(false)
		expect(ctrl.value).toBe(true)
	})

	it('клик не снимает indeterminate у readonly', async () => {
		const ctrl = new TCheckBox({ indeterminate: true, readonly: true })
		const input = field(mount(() => <CheckBox ctrl={ctrl} />).root())

		await nextFrame()
		input.click()

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
const scopeMark = (scope: TMarkScope): JSX.Element => (
	<b>{`${scope.value}/${scope.indeterminate}`}</b>
)

describe('CheckBox · отметка', () => {
	/** Отметка — в коробке: иконка или содержимое слота. */
	const mark = (root: HTMLElement) => find(root, '.s-check-box__container', HTMLElement)

	it('выбранный — иконка из пакета по роли check', () => {
		const svg = find(mark(mount(() => <CheckBox value />).root()), 'svg', SVGSVGElement)

		expect(svg.getAttribute('viewBox')).toBe(material.check.viewBox)
		expect(svg.innerHTML).toBe(bodyOf(material.check))
		expect(svg.classList.contains('s-check-box__mark')).toBe(true)
	})

	it('частично выбранный — иконка по роли checkIndeterminate, и поверх значения', () => {
		const svg = find(
			mark(mount(() => <CheckBox value indeterminate />).root()),
			'svg',
			SVGSVGElement,
		)

		expect(svg.innerHTML).toBe(bodyOf(material.checkIndeterminate))
	})

	it('невыбранный — коробка пуста', () => {
		expect(mark(mount(() => <CheckBox />).root()).childNodes).toHaveLength(0)
	})

	/**
	 * Отметка — `svg` роли, а не компонент Icon: тот собирал бы свой контекст и
	 * плагины на каждую смену отметки, в таблице — тысячами. У Icon корень
	 * всегда с классом `s-icon`, у отметки его нет; размер ей даёт тема флажка.
	 */
	it('отметка — не компонент Icon, и на смену отметки Icon не собирается', () => {
		const ctrl = new TCheckBox({ value: true })
		const { root } = mount(() => <CheckBox ctrl={ctrl} />)

		ctrl.indeterminate = true
		ctrl.indeterminate = false
		ctrl.value = false
		ctrl.value = true
		ctrl.size = 'lg'

		const svg = find(mark(root()), 'svg', SVGSVGElement)

		expect(svg.classList.contains('s-check-box__mark')).toBe(true)
		expect(root().querySelector('.s-icon')).toBeNull()
	})

	it('иконка переживает перерисовку — тот же узел', () => {
		const ctrl = new TCheckBox({ value: true })
		const { root } = mount(() => <CheckBox ctrl={ctrl} />)
		const svg = find(mark(root()), 'svg', SVGSVGElement)

		ctrl.size = 'lg'

		expect(find(mark(root()), 'svg', SVGSVGElement)).toBe(svg)
	})

	/**
	 * Роль читается на отрисовке отметки, а не при сборке флажка: пакет,
	 * подключённый позже, виден у отметки, нарисованной после него. Отметку,
	 * которая уже стоит, Solid без смены её состояния не перерисовывает.
	 */
	it('иконка по роли — из пакета на момент отрисовки', () => {
		const custom: TIconSource = { viewBox: '0 0 10 10', body: '<circle r="5"></circle>' }
		const ctrl = new TCheckBox()
		const { root } = mount(() => <CheckBox ctrl={ctrl} />)

		try {
			setIcons({ check: custom })
			ctrl.value = true

			const svg = find(mark(root()), 'svg', SVGSVGElement)

			expect(svg.getAttribute('viewBox')).toBe('0 0 10 10')
			expect(svg.innerHTML).toBe(bodyOf(custom))
		} finally {
			setIcons(material)
		}
	})

	it('слот icon подменяет иконку и получает scope', () => {
		const el = mount(() => <CheckBox value icon={scopeMark} />).root()

		expect(mark(el).innerHTML).toBe('<b>true/false</b>')
	})

	it('слот indeterminate-icon подменяет иконку частично выбранного', () => {
		const el = mount(() => <CheckBox indeterminate indeterminate-icon={scopeMark} />).root()

		expect(mark(el).innerHTML).toBe('<b>false/true</b>')
	})

	/**
	 * Слот разворачивается один раз: геттер слота в пропсах Solid на каждое
	 * чтение создаёт узлы заново, а проверка «задан ли слот» не должна
	 * рисовать второй экземпляр. Готовые узлы переживают смену отметки.
	 */
	it('слот icon — один экземпляр, и тот же узел после снятия и возврата отметки', () => {
		const ctrl = new TCheckBox({ value: true })
		const el = mount(() => <CheckBox ctrl={ctrl} icon={<b>✓</b>} />).root()
		const node = mark(el).querySelector('b')

		expect(mark(el).querySelectorAll('b')).toHaveLength(1)

		ctrl.value = false
		ctrl.value = true

		expect(mark(el).querySelector('b')).toBe(node)
	})

	it('слоты — не атрибуты поля', () => {
		const input = field(mount(() => <CheckBox value icon={<b>✓</b>} />).root())

		expect(input.hasAttribute('icon')).toBe(false)
	})
})

describe('Switch · роль и ручка', () => {
	/** Содержимое ручки. */
	const thumb = (root: HTMLElement) => find(root, '.s-switch__track--thumb', HTMLElement)

	it('role="switch" на <input>, а не на корне', () => {
		const el = mount(() => <Switch />).root()

		expect(field(el).getAttribute('role')).toBe('switch')
		expect(el.hasAttribute('role')).toBe(false)
	})

	it('в ручке — слот off у выключенного и on у включённого', () => {
		const ctrl = new TSwitch()
		const el = mount(() => <Switch ctrl={ctrl} on={<i>вкл</i>} off={<i>выкл</i>} />).root()

		expect(thumb(el).innerHTML).toBe('<i>выкл</i>')

		ctrl.value = true

		expect(thumb(el).innerHTML).toBe('<i>вкл</i>')
	})

	it('слоты получают scope — значение и инстанс', () => {
		const ctrl = new TSwitch({ value: true })
		const on = (scope: { value: boolean | undefined; ctrl: ISwitch }) => (
			<i>{`${scope.value}:${scope.ctrl === ctrl}`}</i>
		)

		expect(thumb(mount(() => <Switch ctrl={ctrl} on={on} />).root()).innerHTML).toBe(
			'<i>true:true</i>',
		)
	})

	it('без слотов ручка пуста', () => {
		expect(thumb(mount(() => <Switch />).root()).childNodes).toHaveLength(0)
	})
})
