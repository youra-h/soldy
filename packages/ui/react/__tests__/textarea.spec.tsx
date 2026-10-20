/**
 * Textarea в React — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`textarea.spec.ts`). Свойства, `aria` и
 * `data-limit` считает ядро, текст счётчика и высоту — плагины, раскладку и
 * настоящий ввод — браузер (`playground/vue/browser/textarea.spec.ts`). Здесь
 * важно, что они сходятся в разметке: наборы на своих узлах, нативные
 * атрибуты у `<textarea>`, ввод — в ядро и событие модели, счётчик по локали
 * поддерева — пояснением поля, — и подпись и справка поля формы `Field`.
 *
 * Своё у React — текст поля: привязки свойства DOM у разметки React нет, и
 * текст проводит поле адаптера (`NativeTextarea`): умолчание — содержимым
 * `<textarea>`, свойство — в узел, если разошлось с ним. Контролируемого поля
 * React нет: его предупреждение в консоль уронило бы тест (сторож консоли в
 * `setup.ts`).
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { act, type ReactElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TTextarea, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Field, LocaleProvider, Textarea, type TextareaProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Textarea. */
const field = (root: ParentNode = document) => find(root, 'textarea', HTMLTextAreaElement)

/** Счётчик символов; нет его — `null`. */
const counter = (root: ParentNode = document) => root.querySelector('.so-textarea__counter')

/** Атрибут ссылок, разобранный на `id`. */
const refsOf = (element: Element, name: string): string[] =>
	(element.getAttribute(name) ?? '').split(' ').filter(Boolean)

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(textarea: HTMLTextAreaElement, text: string): void {
	act(() => {
		textarea.value = text
		textarea.dispatchEvent(new Event('input', { bubbles: true }))
	})
}

describe('Textarea · разметка', () => {
	it('корень — div с классами и dataset, внутри — поле без класса', () => {
		const el = mount(<Textarea size="lg" readonly required direction="rtl" />).root()

		expect(el.localName).toBe('div')
		expect([...el.classList]).toEqual(
			expect.arrayContaining([
				'so-textarea',
				'so-textarea--size-lg',
				'so-textarea--readonly',
				'so-textarea--required',
			]),
		)
		expect(el.dataset['disabled']).toBe('false')
		expect(el.getAttribute('dir')).toBe('rtl')
		expect([...el.children].map((node) => node.localName)).toEqual(['textarea'])
		expect(field(el).hasAttribute('class')).toBe(false)
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('корень рисуется по tag', () => {
		expect(mount(<Textarea tag="section" />).root().localName).toBe('section')
	})

	it('нативные атрибуты — у <textarea>: id, name, rows, maxlength, placeholder', () => {
		const textarea = field(
			mount(
				<Textarea
					id="about"
					name="about"
					rows={4}
					maxlength={200}
					placeholder="О себе"
					value="Текст"
				/>,
			).root(),
		)

		expect([textarea.id, textarea.name, textarea.placeholder]).toEqual([
			'about',
			'about',
			'О себе',
		])
		expect([textarea.rows, textarea.maxLength]).toEqual([4, 200])
		expect(textarea.value).toBe('Текст')
	})

	it('без rows — две строки, как у браузера; без maxlength — атрибута нет', () => {
		const textarea = field(mount(<Textarea />).root())

		expect(textarea.getAttribute('rows')).toBe('2')
		expect(textarea.hasAttribute('maxlength')).toBe(false)
	})

	it('disabled, readonly, required — нативные, без ARIA-дублей; имя — у поля', () => {
		const el = mount(<Textarea disabled readonly required aria_label="О себе" />).root()
		const textarea = field(el)

		expect([textarea.disabled, textarea.readOnly, textarea.required]).toEqual([
			true,
			true,
			true,
		])
		expect(textarea.hasAttribute('aria-disabled')).toBe(false)
		expect(textarea.hasAttribute('aria-readonly')).toBe(false)
		// Поле только для чтения браузер не проверяет — обязательность скажет ARIA
		expect(textarea.getAttribute('aria-required')).toBe('true')
		expect(textarea.getAttribute('aria-label')).toBe('О себе')
		expect(el.hasAttribute('disabled')).toBe(false)
		expect(el.dataset['disabled']).toBe('true')
	})

	it('атрибуты потребителя: класс и стиль — корню, остальное — полю', () => {
		const onKeyDown = vi.fn()
		const el = mount(
			<Textarea
				className="probe"
				style={{ width: '300px' }}
				data-probe="x"
				autoComplete="off"
				onKeyDown={onKeyDown}
			/>,
		).root()
		const textarea = field(el)

		expect(el.classList.contains('probe')).toBe(true)
		expect(el.style.width).toBe('300px')
		expect(el.hasAttribute('data-probe')).toBe(false)
		expect(textarea.hasAttribute('class')).toBe(false)
		expect(textarea.hasAttribute('style')).toBe(false)
		expect(textarea.dataset['probe']).toBe('x')
		expect(textarea.getAttribute('autocomplete')).toBe('off')

		act(() => {
			textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
		})

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})
})

describe('Textarea · ввод', () => {
	it('набранное — в ctrl.value и одним onChangeValue', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const onChangeValue = vi.fn()
		const textarea = field(mount(<Textarea ctrl={ctrl} onChangeValue={onChangeValue} />).root())

		await nextFrame()
		type(textarea, 'а\nб')

		expect(ctrl.value).toBe('а\nб')
		expect(textarea.value).toBe('а\nб')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'а\nб', oldValue: 'а' }]])
	})

	it('readonly — ввод в значение не уходит', async () => {
		const onChangeValue = vi.fn()
		const textarea = field(
			mount(<Textarea value="а" readonly onChangeValue={onChangeValue} />).root(),
		)

		await nextFrame()
		type(textarea, 'аб')

		expect(onChangeValue).not.toHaveBeenCalled()
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * в `value` сбросила бы каретку в конец, а во время набора через IME —
	 * прервала бы его.
	 */
	it('набор не переписывает поле', async () => {
		const textarea = field(mount(<Textarea />).root())

		await nextFrame()

		const write = vi.spyOn(textarea, 'value', 'set')

		type(textarea, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	it('значение из кода — в поле, и после ввода тоже', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const textarea = field(mount(<Textarea ctrl={ctrl} />).root())

		await nextFrame()
		type(textarea, 'аб')

		act(() => {
			ctrl.value = 'новое'
		})

		expect(textarea.value).toBe('новое')
	})

	/**
	 * Родитель перерисовался — повторённый `value` в ядро не пишется, и
	 * набранное остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * пустое поле, как у Vue.
	 */
	it('перерисовка родителя: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const { root, render } = mount(<Textarea value="a" />)

		await nextFrame()
		type(field(root()), 'ab')

		render(<Textarea value="a" placeholder="Текст" />)

		expect(field(root()).value).toBe('ab')

		render(<Textarea value="c" placeholder="Текст" />)

		expect(field(root()).value).toBe('c')

		render(<Textarea placeholder="Текст" />)

		expect(field(root()).value).toBe('')
	})
})

describe('Textarea · счётчик', () => {
	it('без counter счётчика нет', () => {
		expect(counter(mount(<Textarea value="abc" maxlength={10} />).root())).toBeNull()
	})

	it('без предела — одно число, с пределом — набрано / предел; следует за вводом', async () => {
		const { root, render } = mount(<Textarea value="abc" counter />)

		expect(counter(root())?.textContent).toBe('3')

		render(<Textarea value="abc" counter maxlength={200} />)

		expect(counter(root())?.textContent).toBe('3 / 200')

		await nextFrame()
		type(field(root()), 'abcd')

		expect(counter(root())?.textContent).toBe('4 / 200')
	})

	it('data-limit корня: ровно предел — reached, больше — exceeded, меньше — нет', () => {
		const { root, render } = mount(<Textarea value="abc" maxlength={3} counter />)

		expect(root().dataset['limit']).toBe('reached')

		render(<Textarea value="abcd" maxlength={3} counter />)

		expect(root().dataset['limit']).toBe('exceeded')
		expect(counter(root())?.textContent).toBe('4 / 3')

		render(<Textarea value="ab" maxlength={3} counter />)

		expect(root().hasAttribute('data-limit')).toBe(false)
	})

	it('счётчик — пояснение поля: aria-describedby на его id, без живого региона', () => {
		const { root, render } = mount(<Textarea value="abc" maxlength={200} counter />)
		const id = counter(root())?.id ?? ''

		expect(id).not.toBe('')
		expect(field(root()).getAttribute('aria-describedby')).toBe(id)
		expect(counter(root())?.hasAttribute('aria-live')).toBe(false)

		render(<Textarea value="abc" maxlength={200} counter={false} />)

		expect(counter(root())).toBeNull()
		expect(field(root()).hasAttribute('aria-describedby')).toBe(false)

		render(<Textarea value="abc" maxlength={200} counter />)

		expect(field(root()).getAttribute('aria-describedby')).toBe(counter(root())?.id)
	})

	it('своё пояснение — после счётчика', () => {
		const el = mount(<Textarea counter aria_describedBy="hint" />).root()

		expect(field(el).getAttribute('aria-describedby')).toBe(`${counter(el)?.id} hint`)
	})

	it('под провайдером — числа по его локали', () => {
		const el = mount(
			<LocaleProvider locale={ruRU}>
				<Textarea value={'x'.repeat(1234)} maxlength={5000} counter />
			</LocaleProvider>,
		).root()

		expect(counter(el)?.textContent).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)
	})
})

describe('Textarea · авторост', () => {
	it('включён — ручки нет; выключили — стили автороста сняты', async () => {
		const { root, render } = mount(<Textarea autoresize />)

		await nextFrame()

		expect(field(root()).style.resize).toBe('none')

		render(<Textarea autoresize={false} />)
		await nextFrame()

		expect(field(root()).style.resize).toBe('')
		expect(field(root()).style.overflowY).toBe('')
		expect(field(root()).style.height).toBe('')
	})

	it('без автороста инлайн-стилей у поля нет', async () => {
		const el = mount(<Textarea value="текст" />).root()

		await nextFrame()

		expect(field(el).hasAttribute('style')).toBe(false)
	})
})

describe('Textarea · в поле формы', () => {
	it('подпись называет поле своим for — на id поля, ссылки нет', () => {
		mount(
			<Field label="О себе">
				<Textarea />
			</Field>,
		)

		const textarea = field()

		expect(textarea.id).not.toBe('')
		expect(find(document, '.so-field__label', HTMLLabelElement).htmlFor).toBe(textarea.id)
		expect(textarea.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('в aria-describedby поля — справка, за ней счётчик', () => {
		mount(
			<Field label="О себе" helper="Подсказка">
				<Textarea counter maxlength={200} />
			</Field>,
		)

		expect(refsOf(field(), 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
			find(document, '.so-textarea__counter', HTMLElement).id,
		])
	})
})

describe('Textarea · серверный рендер', () => {
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

	it('renderToString несёт текст содержимым <textarea>', () => {
		const container = document.createElement('div')

		container.innerHTML = renderToString(<Textarea value={'а\nб'} />)

		expect(field(container).textContent).toBe('а\nб')
		expect(field(container).hasAttribute('value')).toBe(false)
	})

	/**
	 * Гидратация без расхождений: разметку сервера и браузера строит одно и то
	 * же, а `id` счётчика и поля от поля формы — от `useId` (id монтирования),
	 * не от счётчика процесса. От счётчика React сообщил бы о расхождении
	 * атрибута (сторож консоли уронил бы тест).
	 */
	it('гидратация без расхождений: текст на месте, ссылки поля на справку и счётчик', () => {
		const { container, onRecoverableError } = hydrate(
			<Field label="О себе" helper="Подсказка">
				<Textarea value="abc" counter maxlength={200} />
			</Field>,
		)
		const parts = ['.so-field__helper', '.so-textarea__counter'].map(
			(selector) => find(container, selector, HTMLElement).id,
		)

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(field(container).value).toBe('abc')
		expect(parts).not.toContain('')
		expect(refsOf(field(container), 'aria-describedby')).toEqual(parts)
	})
})

describe('Textarea · типы', () => {
	/**
	 * Событие `input` дескриптора даёт колбэк `onInput` — то же имя, что у
	 * обработчика DOM; `UseDomProps` вычитает имена событий из атрибутов, как у
	 * Input. Предел и «только чтение» — входы `maxlength` и `readonly`: их
	 * имена DOM (`maxLength`, `readOnly`) были бы вторым путём к тому же
	 * состоянию. Проверяет не vitest, а шаг CI «Типы — React».
	 */
	it('onInput — колбэк события input дескриптора; maxLength и readOnly — не атрибуты', () => {
		expectTypeOf<NonNullable<TextareaProps['onInput']>>().toEqualTypeOf<
			(payload: TValuePayload<string>) => void
		>()
		expectTypeOf<TextareaProps>().not.toHaveProperty('maxLength')
		expectTypeOf<TextareaProps>().not.toHaveProperty('readOnly')
	})
})
