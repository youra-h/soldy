/**
 * Textarea в Solid — проводка целиком, на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`textarea.spec.ts`) и React. Свойства, `aria`
 * и `data-limit` считает ядро, текст счётчика и высоту — плагины, раскладку и
 * настоящий ввод — браузер (`playground/vue/browser/textarea.spec.ts`). Здесь
 * важно, что они сходятся в разметке: наборы на своих узлах, нативные
 * атрибуты у `<textarea>`, ввод — в ядро и событие модели, счётчик по локали
 * поддерева — пояснением поля, — и подпись и справка поля формы `Field`.
 *
 * Текст поля разметка пишет свойством узла, и только когда он разошёлся с
 * узлом (`textareaText`). Содержимым `<textarea>` текст уходит в серверную
 * разметку — её проверяет `textarea.server.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { createSignal } from 'solid-js'
import { TTextarea, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Field, LocaleProvider, Textarea, type TextareaProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

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
	textarea.value = text
	textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Textarea · разметка', () => {
	it('корень — div с классами и dataset, внутри — поле без класса', () => {
		const el = mount(() => <Textarea size="lg" readonly required direction="rtl" />).root()

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
		expect(mount(() => <Textarea tag="section" />).root().localName).toBe('section')
	})

	it('нативные атрибуты — у <textarea>: id, name, rows, maxlength, placeholder', () => {
		const textarea = field(
			mount(() => (
				<Textarea
					id="about"
					name="about"
					rows={4}
					maxlength={200}
					placeholder="О себе"
					value="Текст"
				/>
			)).root(),
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
		const textarea = field(mount(() => <Textarea />).root())

		expect(textarea.getAttribute('rows')).toBe('2')
		expect(textarea.hasAttribute('maxlength')).toBe(false)
	})

	it('disabled, readonly, required — нативные, без ARIA-дублей; имя — у поля', () => {
		const el = mount(() => <Textarea disabled readonly required aria_label="О себе" />).root()
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
		const el = mount(() => (
			<Textarea
				class="probe"
				style={{ width: '300px' }}
				data-probe="x"
				autocomplete="off"
				onKeyDown={onKeyDown}
			/>
		)).root()
		const textarea = field(el)

		expect(el.classList.contains('probe')).toBe(true)
		expect(el.style.width).toBe('300px')
		expect(el.hasAttribute('data-probe')).toBe(false)
		expect(textarea.hasAttribute('class')).toBe(false)
		expect(textarea.hasAttribute('style')).toBe(false)
		expect(textarea.dataset['probe']).toBe('x')
		expect(textarea.getAttribute('autocomplete')).toBe('off')

		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})

	/**
	 * `ref` потребителя получает корень поля, а не `<textarea>`: до поля
	 * потребитель дойдёт от корня. Свой `ref` у `<textarea>` поле при этом не
	 * теряет: значение из ядра доходит до узла и после набора.
	 */
	it('ref потребителя получает корень и не отнимает у поля его узел', async () => {
		const ctrl = new TTextarea()
		const nodes: Element[] = []
		const root = mount(() => <Textarea ctrl={ctrl} ref={(node) => nodes.push(node)} />).root()
		const textarea = field(root)

		expect(nodes).toHaveLength(1)
		expect(nodes[0]).toBe(root)

		await nextFrame()
		type(textarea, 'abc')

		ctrl.value = 'из кода'

		expect(textarea.value).toBe('из кода')
	})
})

describe('Textarea · ввод', () => {
	it('набранное — в ctrl.value и одним onChangeValue', async () => {
		const ctrl = new TTextarea({ value: 'а' })
		const onChangeValue = vi.fn()
		const textarea = field(
			mount(() => <Textarea ctrl={ctrl} onChangeValue={onChangeValue} />).root(),
		)

		await nextFrame()
		type(textarea, 'а\nб')

		expect(ctrl.value).toBe('а\nб')
		expect(textarea.value).toBe('а\nб')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'а\nб', oldValue: 'а' }]])
	})

	it('readonly — ввод в значение не уходит', async () => {
		const onChangeValue = vi.fn()
		const textarea = field(
			mount(() => <Textarea value="а" readonly onChangeValue={onChangeValue} />).root(),
		)

		await nextFrame()
		type(textarea, 'аб')

		expect(onChangeValue).not.toHaveBeenCalled()
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем» — браузер
	 * перестал бы проверять `minlength` и `maxlength`. Привязка `value` Solid
	 * записала бы его второй раз.
	 */
	it('набор не переписывает поле', async () => {
		const textarea = field(mount(() => <Textarea />).root())

		await nextFrame()

		const write = vi.spyOn(textarea, 'value', 'set')

		type(textarea, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	/**
	 * Родитель перерисовался — повторённый `value` в ядро не пишется, и
	 * набранное остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * пустое поле, как у Vue.
	 */
	it('перерисовка родителя: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const [value, setValue] = createSignal<string | undefined>('a')
		const [placeholder, setPlaceholder] = createSignal<string | undefined>(undefined)
		const { root } = mount(() => <Textarea value={value()} placeholder={placeholder()} />)

		await nextFrame()
		type(field(root()), 'ab')

		setPlaceholder('Текст')

		expect(field(root()).value).toBe('ab')

		setValue('c')

		expect(field(root()).value).toBe('c')

		setValue(undefined)

		expect(field(root()).value).toBe('')
	})
})

describe('Textarea · счётчик', () => {
	it('без counter счётчика нет', () => {
		expect(counter(mount(() => <Textarea value="abc" maxlength={10} />).root())).toBeNull()
	})

	it('без предела — одно число, с пределом — набрано / предел; следует за вводом', async () => {
		const [maxlength, setMaxlength] = createSignal<number | undefined>(undefined)
		const { root } = mount(() => <Textarea value="abc" counter maxlength={maxlength()} />)

		expect(counter(root())?.textContent).toBe('3')

		setMaxlength(200)

		expect(counter(root())?.textContent).toBe('3 / 200')

		await nextFrame()
		type(field(root()), 'abcd')

		expect(counter(root())?.textContent).toBe('4 / 200')
	})

	it('data-limit корня: ровно предел — reached, больше — exceeded, меньше — нет', () => {
		const [value, setValue] = createSignal('abc')
		const { root } = mount(() => <Textarea value={value()} maxlength={3} counter />)

		expect(root().dataset['limit']).toBe('reached')

		setValue('abcd')

		expect(root().dataset['limit']).toBe('exceeded')
		expect(counter(root())?.textContent).toBe('4 / 3')

		setValue('ab')

		expect(root().hasAttribute('data-limit')).toBe(false)
	})

	it('счётчик — пояснение поля: aria-describedby на его id, без живого региона', () => {
		const [shown, setShown] = createSignal(true)
		const { root } = mount(() => <Textarea value="abc" maxlength={200} counter={shown()} />)
		const id = counter(root())?.id ?? ''

		expect(id).not.toBe('')
		expect(field(root()).getAttribute('aria-describedby')).toBe(id)
		expect(counter(root())?.hasAttribute('aria-live')).toBe(false)

		setShown(false)

		expect(counter(root())).toBeNull()
		expect(field(root()).hasAttribute('aria-describedby')).toBe(false)

		setShown(true)

		expect(field(root()).getAttribute('aria-describedby')).toBe(counter(root())?.id)
	})

	it('своё пояснение — после счётчика', () => {
		const el = mount(() => <Textarea counter aria_describedBy="hint" />).root()

		expect(field(el).getAttribute('aria-describedby')).toBe(`${counter(el)?.id} hint`)
	})

	it('под провайдером — числа по его локали', () => {
		const { container } = mount(() => (
			<LocaleProvider locale={ruRU}>
				<Textarea value={'x'.repeat(1234)} maxlength={5000} counter />
			</LocaleProvider>
		))

		expect(counter(container)?.textContent).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)
	})
})

describe('Textarea · авторост', () => {
	it('включён — ручки нет; выключили — стили автороста сняты', async () => {
		const [autoresize, setAutoresize] = createSignal(true)
		const { root } = mount(() => <Textarea autoresize={autoresize()} />)

		await nextFrame()

		expect(field(root()).style.resize).toBe('none')

		setAutoresize(false)
		await nextFrame()

		expect(field(root()).style.resize).toBe('')
		expect(field(root()).style.overflowY).toBe('')
		expect(field(root()).style.height).toBe('')
	})

	it('без автороста инлайн-стилей у поля нет', async () => {
		const el = mount(() => <Textarea value="текст" />).root()

		await nextFrame()

		expect(field(el).hasAttribute('style')).toBe(false)
	})
})

describe('Textarea · в поле формы', () => {
	it('подпись называет поле своим for — на id поля, ссылки нет', () => {
		mount(() => (
			<Field label="О себе">
				<Textarea />
			</Field>
		))

		const textarea = field()

		expect(textarea.id).not.toBe('')
		expect(find(document, '.so-field__label', HTMLLabelElement).htmlFor).toBe(textarea.id)
		expect(textarea.hasAttribute('aria-labelledby')).toBe(false)
	})

	it('в aria-describedby поля — справка, за ней счётчик', () => {
		mount(() => (
			<Field label="О себе" helper="Подсказка">
				<Textarea counter maxlength={200} />
			</Field>
		))

		expect(refsOf(field(), 'aria-describedby')).toEqual([
			find(document, '.so-field__helper', HTMLElement).id,
			find(document, '.so-textarea__counter', HTMLElement).id,
		])
	})
})

describe('Textarea · типы', () => {
	/**
	 * Событие `input` дескриптора даёт колбэк `onInput` — как у Input. Предел и
	 * «только чтение» — входы `maxlength` и `readonly`: их имена DOM
	 * (`maxLength`, `readOnly`) и содержимое `<textarea>` (`textContent`) были
	 * бы вторым путём к тому же состоянию. Проверяет не vitest, а шаг CI
	 * «Типы — Solid».
	 */
	it('onInput — колбэк события input дескриптора; maxLength, readOnly и textContent — не атрибуты', () => {
		expectTypeOf<NonNullable<TextareaProps['onInput']>>().toEqualTypeOf<
			(payload: TValuePayload<string>) => void
		>()
		expectTypeOf<TextareaProps>().not.toHaveProperty('maxLength')
		expectTypeOf<TextareaProps>().not.toHaveProperty('readOnly')
		expectTypeOf<TextareaProps>().not.toHaveProperty('textContent')
	})
})
