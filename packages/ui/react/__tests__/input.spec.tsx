/**
 * Input в React: текстовое поле, чьё значение ведёт ядро.
 *
 * Разметка — как у Vue (`input-control-attrs.spec.ts`): корень по `tag`,
 * `<input>` внутри, слоты по сторонам. Наборы ядра — каждый на своём
 * элементе: `attrs` (`dir`) на корне, `aria` на поле; нативные атрибуты поля
 * без ARIA-дублей. Атрибуты потребителя делятся так же, как у Vue: класс и
 * стиль — корню, остальное — полю.
 *
 * Значение здесь впервые управляется за пределами Vue. Привязки свойства DOM
 * у разметки React нет, и текст проводит поле адаптера (`NativeInput`):
 * умолчание — атрибутом, свойство — в узел, если разошлось с ним. В ядро ввод
 * несёт `TInputPlugin`, а его слушатель встаёт по `ready` узла — кадром позже.
 * Контролируемого поля React нет: его предупреждение в консоль уронило бы
 * тест (сторож консоли в `setup.ts`).
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { StrictMode, act, createRef, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TInput, type IInput, type TValuePayload } from '@soldy-ui/core'
import { Input, type InputProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Input. */
const field = (root: HTMLElement) => find(root, 'input', HTMLInputElement)

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(input: HTMLInputElement, text: string): void {
	act(() => {
		input.value = text
		input.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

describe('Input · разметка', () => {
	it('корень — div по умолчанию, внутри текстовое поле', () => {
		const el = mount(<Input />).root()

		expect(el.localName).toBe('div')
		expect(el.classList.contains('s-input')).toBe(true)
		expect(field(el).type).toBe('text')
	})

	it('корень рисуется по tag', () => {
		expect(mount(<Input tag="span" />).root().localName).toBe('span')
	})

	it('слоты leading и trailing — по сторонам поля, scope — инстанс поля', () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mount(
			<Input
				ctrl={ctrl}
				leading={<i>L</i>}
				trailing={(scope: { ctrl: IInput }) => <b>{scope.ctrl.value}</b>}
			/>,
		).root()

		expect([...el.children].map((part) => part.localName + '.' + part.className)).toEqual([
			'div.s-input__leading',
			'input.',
			'div.s-input__trailing',
		])
		expect(find(el, '.s-input__leading', HTMLElement).innerHTML).toBe('<i>L</i>')
		expect(find(el, '.s-input__trailing', HTMLElement).innerHTML).toBe('<b>текст</b>')
	})

	it('слот не передан — обёртки нет, и null её не оставляет', () => {
		const el = mount(<Input leading={null} />).root()

		expect(el.querySelector('.s-input__leading')).toBeNull()
		expect(el.querySelector('.s-input__trailing')).toBeNull()
		expect(el.children).toHaveLength(1)
	})

	it('слоты — не атрибуты поля и корня', () => {
		const el = mount(<Input leading={<i>L</i>} />).root()

		expect(el.hasAttribute('leading')).toBe(false)
		expect(field(el).hasAttribute('leading')).toBe(false)
	})
})

describe('Input · атрибуты', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(mount(<Input disabled required />).root())

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const input = field(mount(<Input readonly />).root())

		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const input = field(mount(<Input required readonly />).root())

		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.getAttribute('aria-required')).toBe('true')
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(
			mount(<Input disabled />)
				.root()
				.hasAttribute('disabled'),
		).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = mount(<Input direction="rtl" />).root()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('id, name и placeholder — на поле', () => {
		const input = field(mount(<Input id="email" name="email" placeholder="Почта" />).root())

		expect(input.id).toBe('email')
		expect(input.name).toBe('email')
		expect(input.placeholder).toBe('Почта')
	})

	it('aria_label доходит до <input>', () => {
		const el = mount(<Input aria_label="Поиск" />).root()

		expect(field(el).getAttribute('aria-label')).toBe('Поиск')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('класс и стиль — на корне, прочие атрибуты — на поле', () => {
		const onKeyDown = vi.fn()
		const el = mount(
			<Input
				className="app-field"
				style={{ color: 'red' }}
				data-testid="field"
				autoComplete="email"
				onKeyDown={onKeyDown}
			/>,
		).root()
		const input = field(el)

		expect(el.classList.contains('s-input')).toBe(true)
		expect(el.classList.contains('app-field')).toBe(true)
		expect(el.style.color).toBe('red')
		expect(el.hasAttribute('data-testid')).toBe(false)

		expect(input.hasAttribute('class')).toBe(false)
		expect(input.hasAttribute('style')).toBe(false)
		expect(input.getAttribute('data-testid')).toBe('field')
		expect(input.getAttribute('autocomplete')).toBe('email')

		act(() => {
			input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
		})

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})
})

describe('Input · значение', () => {
	it('из пропа — в поле и атрибутом value', () => {
		const input = field(mount(<Input value="abc" />).root())

		expect(input.value).toBe('abc')
		expect(input.getAttribute('value')).toBe('abc')
	})

	it('без значения — пустое поле', () => {
		expect(field(mount(<Input />).root()).value).toBe('')
	})

	it('ввод — в ctrl.value и одним onChangeValue', async () => {
		const ctrl = new TInput()
		const onChangeValue = vi.fn()
		const input = field(mount(<Input ctrl={ctrl} onChangeValue={onChangeValue} />).root())

		await nextFrame()
		type(input, 'abc')

		expect(ctrl.value).toBe('abc')
		expect(input.value).toBe('abc')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'abc', oldValue: undefined }]])
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * в `value` сбросила бы каретку в конец, а во время набора через IME —
	 * прервала бы его.
	 */
	it('набор не переписывает поле', async () => {
		const input = field(mount(<Input />).root())

		await nextFrame()

		const write = vi.spyOn(input, 'value', 'set')

		type(input, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	it('ctrl.value из кода после ввода — в поле', async () => {
		const ctrl = new TInput()
		const input = field(mount(<Input ctrl={ctrl} />).root())

		await nextFrame()
		type(input, 'abc')

		act(() => {
			ctrl.value = 'xyz'
		})

		expect(input.value).toBe('xyz')
	})

	/**
	 * Родитель перерисовался — повторённый `value` в ядро не пишется, и
	 * набранное остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * `undefined` — пустое поле, как у Vue.
	 */
	it('перерисовка родителя: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const { root, render } = mount(<Input value="a" />)

		await nextFrame()
		type(field(root()), 'ab')

		render(<Input value="a" placeholder="Текст" />)

		expect(field(root()).value).toBe('ab')

		render(<Input value="c" placeholder="Текст" />)

		expect(field(root()).value).toBe('c')

		render(<Input placeholder="Текст" />)

		expect(field(root()).value).toBe('')
	})

	/**
	 * StrictMode пересобирает контекст: слушатель ввода старого набора плагинов
	 * снят, нового — стоит. Ввод доходит, и событие одно.
	 */
	it('StrictMode — ввод доходит, событие одно', async () => {
		const onChangeValue = vi.fn()
		const { root } = mount(
			<StrictMode>
				<Input onChangeValue={onChangeValue} />
			</StrictMode>,
		)

		await nextFrame()
		type(field(root()), 'abc')

		expect(field(root()).value).toBe('abc')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'abc', oldValue: undefined }]])
	})

	/**
	 * `ref`, пришедший с атрибутами, свой ref поля не выбивает: без него
	 * значение из ядра до узла не дошло бы. Узел сначала получает набор — у
	 * нетронутого поля значение доехало бы и атрибутом `value`.
	 */
	it('ref потребителя не отнимает у поля его узел', async () => {
		const ctrl = new TInput()
		const attributes = { ref: createRef<HTMLInputElement>() }
		const input = field(mount(<Input ctrl={ctrl} {...attributes} />).root())

		await nextFrame()
		type(input, 'abc')

		act(() => {
			ctrl.value = 'из кода'
		})

		expect(input.value).toBe('из кода')
	})
})

describe('Input · серверный рендер', () => {
	it('renderToString несёт значение атрибутом value', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(<Input value="abc" />)

		expect(find(container, 'input', HTMLInputElement).getAttribute('value')).toBe('abc')
	})

	/** Сервер и браузер в одном процессе: рендер сервера и гидратация — одна разметка. */
	function hydrate(element: ReactElement): {
		container: HTMLElement
		onRecoverableError: ReturnType<typeof vi.fn>
	} {
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})

		return { container, onRecoverableError }
	}

	const idsOf = (container: HTMLElement) =>
		[...container.querySelectorAll('input')].map((input) => input.id)

	/**
	 * Автоматический `id` поля — основа экземпляра (`idBase`) от `useId`, а не
	 * `uid` ядра. Счётчик экземпляров у сервера и браузера свой — здесь это
	 * видно и в одном процессе: рендер сервера уже сдвинул его, и экземпляры
	 * гидратации получают другие `uid`. От `uid` React сообщил бы о
	 * расхождении атрибута `id` (сторож консоли уронил бы тест).
	 */
	it('гидратация без расхождений, значение на месте', () => {
		const { container, onRecoverableError } = hydrate(<Input value="abc" />)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(find(container, 'input', HTMLInputElement).value).toBe('abc')
	})

	it('автоматический id у сервера и браузера один, у соседей — разный', () => {
		const element = (
			<div>
				<Input value="a" />
				<Input value="b" />
			</div>
		)
		const server = document.createElement('div')

		server.innerHTML = renderToString(element)

		const { container } = hydrate(element)
		const ids = idsOf(container)

		expect(ids).toEqual(idsOf(server))
		expect(ids.every((id) => id !== '')).toBe(true)
		expect(new Set(ids).size).toBe(2)
	})

	it('заданный id — как есть, на сервере и в браузере', () => {
		const { container } = hydrate(<Input id="field" value="abc" />)

		expect(idsOf(container)).toEqual(['field'])
	})
})

describe('Input · типы', () => {
	/**
	 * Событие `input` дескриптора даёт колбэк `onInput` — то же имя, что у
	 * обработчика DOM. Пересечение с атрибутом свело бы их в функцию, которой
	 * не написать; `UseDomProps` вычитает имена событий из атрибутов, как
	 * пропсы и слоты. Проверяет не vitest, а шаг CI «Типы — React».
	 */
	it('onInput — колбэк события input дескриптора, а не обработчик DOM', () => {
		expectTypeOf<NonNullable<InputProps['onInput']>>().toEqualTypeOf<
			(payload: TValuePayload<string>) => void
		>()
	})
})
