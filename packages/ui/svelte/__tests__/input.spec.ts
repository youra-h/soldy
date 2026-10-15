/**
 * Input в Svelte: текстовое поле, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у React (`input.spec.tsx`) и Vue
 * (`input-control-attrs.spec.ts`): корень по `tag`, `<input>` внутри, слоты
 * по сторонам. Наборы ядра — каждый на своём элементе: `attrs` (`dir`) на
 * корне, `aria` на поле; нативные атрибуты поля без ARIA-дублей. Атрибуты
 * потребителя делятся так же, как у Vue: класс и стиль — корню, остальное —
 * полю.
 *
 * Текст поля разметка пишет свойством узла, и только когда он разошёлся с
 * узлом. В ядро ввод несёт `TInputPlugin`, а его слушатель встаёт по `ready`
 * узла — кадром позже. Атрибутом `value` текст уходит в серверную разметку —
 * её проверяет `input.server.spec.ts`; гидратацию пакет не проверит (см.
 * `vitest.config.ts`).
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { createAttachmentKey } from 'svelte/attachments'
import { TInput, type IInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Input, type InputProps } from '@soldy-ui/svelte'
import InputClear from './InputClear.test.svelte'
import LocaleInput from './LocaleInput.test.svelte'
import { find, htmlOf, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Input. */
const field = (root: ParentNode) => find(root, 'input', HTMLInputElement)

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(input: HTMLInputElement, text: string): void {
	input.value = text
	input.dispatchEvent(new Event('input', { bubbles: true }))
	flushSync()
}

/** Содержимое слота без scope. */
const markup = (html: string) => createRawSnippet(() => ({ render: () => html }))

describe('Input · разметка', () => {
	it('корень — div по умолчанию, внутри текстовое поле', () => {
		const el = mount(Input, {}).root()

		expect(el.localName).toBe('div')
		expect(el.classList.contains('so-input')).toBe(true)
		expect(field(el).type).toBe('text')
	})

	it('корень рисуется по tag', () => {
		expect(mount(Input, { tag: 'span' }).root().localName).toBe('span')
	})

	it('слоты leading и trailing — по сторонам поля, scope — инстанс поля', () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mount(Input, {
			ctrl,
			leading: markup('<i>L</i>'),
			trailing: createRawSnippet((scope: () => { ctrl: IInput }) => ({
				render: () => `<b>${scope().ctrl.value}</b>`,
			})),
		}).root()

		expect([...el.children].map((part) => part.localName + '.' + part.className)).toEqual([
			'div.so-input__leading',
			'input.',
			'div.so-input__trailing',
		])
		expect(htmlOf(find(el, '.so-input__leading', HTMLElement))).toBe('<i>L</i>')
		expect(htmlOf(find(el, '.so-input__trailing', HTMLElement))).toBe('<b>текст</b>')
	})

	it('слот не передан — обёртки нет, и undefined её не оставляет', () => {
		const el = mount(Input, { leading: undefined }).root()

		expect(el.querySelector('.so-input__leading')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
		expect(el.children).toHaveLength(1)
	})

	it('слоты — не атрибуты поля и корня', () => {
		const el = mount(Input, { leading: markup('<i>L</i>') }).root()

		expect(el.hasAttribute('leading')).toBe(false)
		expect(field(el).hasAttribute('leading')).toBe(false)
	})
})

describe('Input · атрибуты', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(mount(Input, { disabled: true, required: true }).root())

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const input = field(mount(Input, { readonly: true }).root())

		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const input = field(mount(Input, { required: true, readonly: true }).root())

		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.getAttribute('aria-required')).toBe('true')
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(mount(Input, { disabled: true }).root().hasAttribute('disabled')).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = mount(Input, { direction: 'rtl' }).root()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('id, name и placeholder — на поле', () => {
		const input = field(
			mount(Input, { id: 'email', name: 'email', placeholder: 'Почта' }).root(),
		)

		expect(input.id).toBe('email')
		expect(input.name).toBe('email')
		expect(input.placeholder).toBe('Почта')
	})

	it('aria_label доходит до <input>', () => {
		const el = mount(Input, { aria_label: 'Поиск' }).root()

		expect(field(el).getAttribute('aria-label')).toBe('Поиск')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('класс и стиль — на корне, прочие атрибуты — на поле', () => {
		const onkeydown = vi.fn()
		const el = mount(Input, {
			class: 'app-field',
			style: 'color: red',
			'data-testid': 'field',
			autocomplete: 'email',
			onkeydown,
		}).root()
		const input = field(el)

		expect(el.classList.contains('so-input')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(el.hasAttribute('data-testid')).toBe(false)

		expect(input.hasAttribute('class')).toBe(false)
		expect(input.hasAttribute('style')).toBe(false)
		expect(input.getAttribute('data-testid')).toBe('field')
		expect(input.getAttribute('autocomplete')).toBe('email')

		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(onkeydown).toHaveBeenCalledTimes(1)
	})

	/**
	 * Attachment потребителя — остальное из его атрибутов: поведение, которое
	 * он вешает на поле (подсказку, автофокус), встаёт на сам `<input>`, а не
	 * на обёртку.
	 */
	it('attachment потребителя — на поле', () => {
		const nodes: Element[] = []
		const el = mount(Input, {
			[createAttachmentKey()]: (node: Element) => {
				nodes.push(node)
			},
		}).root()

		expect(nodes).toHaveLength(1)
		expect(nodes[0]).toBe(field(el))
	})
})

describe('Input · значение', () => {
	it('из пропа — в поле', () => {
		expect(field(mount(Input, { value: 'abc' }).root()).value).toBe('abc')
	})

	it('без значения — пустое поле', () => {
		expect(field(mount(Input, {}).root()).value).toBe('')
	})

	it('ввод — в ctrl.value и одним onChangeValue', async () => {
		const ctrl = new TInput()
		const onChangeValue = vi.fn()
		const input = field(mount(Input, { ctrl, onChangeValue }).root())

		await nextFrame()
		type(input, 'abc')

		expect(ctrl.value).toBe('abc')
		expect(input.value).toBe('abc')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'abc', oldValue: undefined }]])
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем» — браузер
	 * перестал бы проверять `minlength` и `maxlength`, — а во время набора
	 * через IME могла бы его прервать.
	 */
	it('набор не переписывает поле', async () => {
		const input = field(mount(Input, {}).root())

		await nextFrame()

		const write = vi.spyOn(input, 'value', 'set')

		type(input, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	it('ctrl.value из кода после ввода — в поле', async () => {
		const ctrl = new TInput()
		const input = field(mount(Input, { ctrl }).root())

		await nextFrame()
		type(input, 'abc')

		ctrl.value = 'xyz'
		flushSync()

		expect(input.value).toBe('xyz')
	})

	/**
	 * Родитель перерисовался — повторённый `value` в ядро не пишется, и
	 * набранное остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * `undefined` — пустое поле, как у Vue.
	 */
	it('перерисовка родителя: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const props = reactiveProps<InputProps>({ value: 'a' })
		const { root } = mount(Input, props)

		await nextFrame()
		type(field(root()), 'ab')

		props.placeholder = 'Текст'
		flushSync()

		expect(field(root()).value).toBe('ab')

		props.value = 'c'
		flushSync()

		expect(field(root()).value).toBe('c')

		delete props.value
		flushSync()

		expect(field(root()).value).toBe('')
	})

	/**
	 * Attachment, пришедший с атрибутами, поле своего узла не лишает: значение
	 * из ядра доходит до узла и после набора — как `ref` потребителя у React.
	 */
	it('attachment потребителя не отнимает у поля его узел', async () => {
		const ctrl = new TInput()
		const nodes: Element[] = []
		const input = field(
			mount(Input, {
				ctrl,
				[createAttachmentKey()]: (node: Element) => {
					nodes.push(node)
				},
			}).root(),
		)

		await nextFrame()
		type(input, 'abc')

		ctrl.value = 'из кода'
		flushSync()

		expect(input.value).toBe('из кода')
		expect(nodes).toHaveLength(1)
	})
})

/**
 * Кнопка очистки — часть поля, как у Vue (`input-clear.spec.ts`): по
 * `clearable`, первой в обёртке у конца поля, перед `trailing`, с именем от
 * ядра. Клик очищает поле командой ядра и до корня не всплывает; своя кнопка —
 * слот `clear` с командой в scope.
 */
describe('Input · кнопка очистки', () => {
	/** Кнопка очистки внутри корня. */
	const clearOf = (root: ParentNode) => find(root, '.so-input__clear', HTMLButtonElement)

	function click(element: HTMLElement): void {
		element.click()
		flushSync()
	}

	it('без clearable кнопки нет, и обёртки у конца поля тоже', () => {
		const el = mount(Input, { value: 'текст' }).root()

		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
	})

	it('по clearable — первой в обёртке у конца, перед содержимым trailing', () => {
		const el = mount(Input, {
			clearable: true,
			name: 'Город',
			trailing: markup('<i class="probe"></i>'),
		}).root()
		const parts = ['.so-input__clear', '.probe']

		expect(
			[...find(el, '.so-input__trailing', HTMLElement).children].map((node) =>
				parts.find((part) => node.matches(part)),
			),
		).toEqual(parts)
		expect(el.classList.contains('so-input--clearable')).toBe(true)
		expect(clearOf(el).getAttribute('aria-label')).toBe('Clear Город')
	})

	it('строку имени задаёт локаль поддерева', () => {
		const { container } = mount(LocaleInput, { locale: ruRU })

		expect(clearOf(container).getAttribute('aria-label')).toBe('Очистить Город')
	})

	it('размер — поля, выключена — вместе с полем, readonly её не гасит', () => {
		const props = reactiveProps<InputProps>({ clearable: true, size: 'lg', readonly: true })
		const { root } = mount(Input, props)

		expect(clearOf(root()).classList.contains('so-button--size-lg')).toBe(true)
		expect(clearOf(root()).disabled).toBe(false)

		props.disabled = true
		flushSync()

		expect(clearOf(root()).disabled).toBe(true)
	})

	it('клик очищает поле и до корня не всплывает', async () => {
		const ctrl = new TInput({ value: 'текст' })
		const onChangeValue = vi.fn()
		const onActionPress = vi.fn()
		const view = mount(Input, { ctrl, clearable: true, onChangeValue, onActionPress })
		const outside = vi.fn()

		view.container.addEventListener('click', outside)

		// Кнопка очищает по клику своего TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		click(clearOf(view.root()))

		expect(ctrl.value).toBe('')
		expect(field(view.root()).value).toBe('')
		expect(onChangeValue).toHaveBeenCalledTimes(1)
		expect(onActionPress).not.toHaveBeenCalled()
		expect(outside).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду ядра — clear приходит и у пустого поля', async () => {
		const ctrl = new TInput({ value: '' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		const el = mount(Input, { ctrl, clearable: true }).root()

		await nextFrame()

		click(clearOf(el))

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Своя кнопка заменяет встроенную целиком и рисуется, когда задана, — без
	 * `clearable`. Команду очистки она берёт из scope и зовёт голой функцией.
	 */
	it('своя кнопка — слот clear с командой очистки в scope', () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mount(InputClear, { ctrl }).root()

		expect(el.querySelector('.so-input__trailing > .probe')).not.toBeNull()
		expect(el.querySelector('.so-input__clear')).toBeNull()

		click(find(el, '.probe', HTMLButtonElement))

		expect(ctrl.value).toBe('')
		expect(field(el).value).toBe('')
	})

	it('своя кнопка при clearable — вместо встроенной; слот не атрибут', () => {
		const el = mount(InputClear, { clearable: true }).root()

		expect(el.querySelector('.probe')).not.toBeNull()
		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.hasAttribute('clear')).toBe(false)
		expect(field(el).hasAttribute('clear')).toBe(false)
	})
})

describe('Input · типы', () => {
	/**
	 * Событие `input` дескриптора даёт колбэк `onInput`, а обработчик DOM у
	 * Svelte — `oninput`: имена разные, и колбэк остаётся колбэком события.
	 * Проверяет не vitest, а шаг CI «Типы — Svelte».
	 */
	it('onInput — колбэк события input дескриптора, а не обработчик DOM', () => {
		expectTypeOf<NonNullable<InputProps['onInput']>>().toEqualTypeOf<
			(payload: TValuePayload<string>) => void
		>()
	})
})
