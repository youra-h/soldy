/**
 * Input в Solid: текстовое поле, чьё значение ведёт ядро.
 *
 * Сценарии — те же, что у React (`input.spec.tsx`) и Vue
 * (`input-control-attrs.spec.ts`): корень по `tag`, `<input>` внутри, слоты
 * по сторонам. Наборы ядра — каждый на своём элементе: `attrs` (`dir`) на
 * корне, `aria` на поле; нативные атрибуты поля без ARIA-дублей. Атрибуты
 * потребителя делятся так же, как у Vue: класс и стиль — корню, остальное —
 * полю.
 *
 * Текст поля разметка пишет свойством узла, и только когда он разошёлся с
 * узлом (`fieldText`). В ядро ввод несёт `TInputPlugin`, а его слушатель
 * встаёт по `ready` узла — кадром позже. Атрибутом `value` текст уходит в
 * серверную разметку — её проверяет `input.server.spec.tsx`.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { createSignal } from 'solid-js'
import { TInput, type IInput, type TValuePayload } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Input, LocaleProvider, type InputProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

/** Поле внутри корня Input. */
const field = (root: ParentNode) => find(root, 'input', HTMLInputElement)

/** Набор текста: браузер меняет значение узла и шлёт `input`. */
function type(input: HTMLInputElement, text: string): void {
	input.value = text
	input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Input · разметка', () => {
	it('корень — div по умолчанию, внутри текстовое поле', () => {
		const el = mount(() => <Input />).root()

		expect(el.localName).toBe('div')
		expect(el.classList.contains('so-input')).toBe(true)
		expect(field(el).type).toBe('text')
	})

	it('корень рисуется по tag', () => {
		expect(mount(() => <Input tag="span" />).root().localName).toBe('span')
	})

	it('слоты leading и trailing — по сторонам поля, scope — инстанс поля', () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mount(() => (
			<Input
				ctrl={ctrl}
				leading={<i>L</i>}
				trailing={(scope: { ctrl: IInput }) => <b>{scope.ctrl.value}</b>}
			/>
		)).root()

		expect([...el.children].map((part) => part.localName + '.' + part.className)).toEqual([
			'div.so-input__leading',
			'input.',
			'div.so-input__trailing',
		])
		expect(find(el, '.so-input__leading', HTMLElement).innerHTML).toBe('<i>L</i>')
		expect(find(el, '.so-input__trailing', HTMLElement).innerHTML).toBe('<b>текст</b>')
	})

	it('слот не передан — обёртки нет, и null её не оставляет', () => {
		const el = mount(() => <Input leading={null} />).root()

		expect(el.querySelector('.so-input__leading')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
		expect(el.children).toHaveLength(1)
	})

	/**
	 * Слот разворачивается один раз: геттер слота в пропсах Solid на каждое
	 * чтение создаёт узлы заново, а проверка «есть ли слот», которая решает про
	 * обёртку, не должна рисовать второй экземпляр.
	 */
	it('слот — один экземпляр: проверка обёртки его не повторяет', () => {
		const el = mount(() => <Input leading={<i>L</i>} trailing={<b>T</b>} />).root()

		expect(el.querySelectorAll('i')).toHaveLength(1)
		expect(el.querySelectorAll('b')).toHaveLength(1)
	})

	it('слот, заданный после монтирования, рисует обёртку, снятый — убирает', () => {
		const [shown, setShown] = createSignal(false)
		const el = mount(() => <Input leading={shown() && <i>L</i>} />).root()

		expect(el.querySelector('.so-input__leading')).toBeNull()

		setShown(true)

		expect(find(el, '.so-input__leading', HTMLElement).innerHTML).toBe('<i>L</i>')

		setShown(false)

		expect(el.querySelector('.so-input__leading')).toBeNull()
	})

	it('слоты — не атрибуты поля и корня', () => {
		const el = mount(() => <Input leading={<i>L</i>} />).root()

		expect(el.hasAttribute('leading')).toBe(false)
		expect(field(el).hasAttribute('leading')).toBe(false)
	})
})

describe('Input · атрибуты', () => {
	it('disabled и required — нативные атрибуты <input>, без ARIA-дублей', () => {
		const input = field(mount(() => <Input disabled required />).root())

		expect(input.hasAttribute('disabled')).toBe(true)
		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('aria-disabled')).toBe(false)
		expect(input.hasAttribute('aria-required')).toBe(false)
	})

	it('readonly — нативный атрибут <input>, без aria-readonly', () => {
		const input = field(mount(() => <Input readonly />).root())

		expect(input.readOnly).toBe(true)
		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('required на readonly-поле дополняется aria-required: браузер его не валидирует', () => {
		const input = field(mount(() => <Input required readonly />).root())

		expect(input.hasAttribute('required')).toBe(true)
		expect(input.hasAttribute('readonly')).toBe(true)
		expect(input.getAttribute('aria-required')).toBe('true')
		expect(input.hasAttribute('aria-readonly')).toBe(false)
	})

	it('на корне нет disabled — у обёртки такого атрибута нет', () => {
		expect(
			mount(() => <Input disabled />)
				.root()
				.hasAttribute('disabled'),
		).toBe(false)
	})

	it('direction: rtl — dir на корне, а не на <input>', () => {
		const el = mount(() => <Input direction="rtl" />).root()

		expect(el.getAttribute('dir')).toBe('rtl')
		expect(field(el).hasAttribute('dir')).toBe(false)
	})

	it('id, name и placeholder — на поле', () => {
		const input = field(
			mount(() => <Input id="email" name="email" placeholder="Почта" />).root(),
		)

		expect(input.id).toBe('email')
		expect(input.name).toBe('email')
		expect(input.placeholder).toBe('Почта')
	})

	it('aria_label доходит до <input>', () => {
		const el = mount(() => <Input aria_label="Поиск" />).root()

		expect(field(el).getAttribute('aria-label')).toBe('Поиск')
		expect(el.hasAttribute('aria-label')).toBe(false)
	})

	it('класс и стиль — на корне, прочие атрибуты — на поле', () => {
		const onKeyDown = vi.fn()
		const el = mount(() => (
			<Input
				class="app-field"
				style={{ color: 'red' }}
				data-testid="field"
				autocomplete="email"
				onKeyDown={onKeyDown}
			/>
		)).root()
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

		expect(onKeyDown).toHaveBeenCalledTimes(1)
	})
})

describe('Input · значение', () => {
	it('из пропа — в поле', () => {
		expect(field(mount(() => <Input value="abc" />).root()).value).toBe('abc')
	})

	it('без значения — пустое поле', () => {
		expect(field(mount(() => <Input />).root()).value).toBe('')
	})

	it('ввод — в ctrl.value и одним onChangeValue', async () => {
		const ctrl = new TInput()
		const onChangeValue = vi.fn()
		const input = field(mount(() => <Input ctrl={ctrl} onChangeValue={onChangeValue} />).root())

		await nextFrame()
		type(input, 'abc')

		expect(ctrl.value).toBe('abc')
		expect(input.value).toBe('abc')
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: 'abc', oldValue: undefined }]])
	})

	/**
	 * Узел уже держит набранное, и поле его не трогает: запись того же текста
	 * из кода сняла бы с поля пометку «изменено пользователем» — браузер
	 * перестал бы проверять `minlength` и `maxlength`. Привязка `value` Solid
	 * записала бы его второй раз.
	 */
	it('набор не переписывает поле', async () => {
		const input = field(mount(() => <Input />).root())

		await nextFrame()

		const write = vi.spyOn(input, 'value', 'set')

		type(input, 'abc')

		// Одна запись — та, которой тест изобразил браузер
		expect(write).toHaveBeenCalledTimes(1)
	})

	/**
	 * Ввод в середину текста: браузер вставил символ и поставил каретку за
	 * ним, ядро приняло текст — каретка на месте, а не в конце поля.
	 */
	it('ввод в середину текста — каретка на месте, после того как ядро приняло значение', async () => {
		const ctrl = new TInput({ value: 'abcd' })
		const input = field(mount(() => <Input ctrl={ctrl} />).root())

		await nextFrame()

		input.value = 'abXcd'
		input.setSelectionRange(3, 3)
		input.dispatchEvent(new Event('input', { bubbles: true }))

		expect(ctrl.value).toBe('abXcd')
		expect(input.selectionStart).toBe(3)
		expect(input.selectionEnd).toBe(3)
	})

	it('ctrl.value из кода после ввода — в поле', async () => {
		const ctrl = new TInput()
		const input = field(mount(() => <Input ctrl={ctrl} />).root())

		await nextFrame()
		type(input, 'abc')

		ctrl.value = 'xyz'

		expect(input.value).toBe('xyz')
	})

	/**
	 * Родитель перерисовался — повторённый `value` в ядро не пишется, и
	 * набранное остаётся. Новый `value` — запись, снятый возвращает умолчание:
	 * `undefined` — пустое поле, как у Vue.
	 */
	it('перерисовка родителя: прежний value не откатывает набранное, новый перезаписывает, снятый — пусто', async () => {
		const [value, setValue] = createSignal<string | undefined>('a')
		const [placeholder, setPlaceholder] = createSignal<string | undefined>(undefined)
		const { root } = mount(() => <Input value={value()} placeholder={placeholder()} />)

		await nextFrame()
		type(field(root()), 'ab')

		setPlaceholder('Текст')

		expect(field(root()).value).toBe('ab')

		setValue('c')

		expect(field(root()).value).toBe('c')

		setValue(undefined)

		expect(field(root()).value).toBe('')
	})

	/**
	 * `ref` потребителя получает корень поля, а не `<input>`: до поля
	 * потребитель дойдёт от корня. Свой `ref` у `<input>` поле при этом не
	 * теряет: значение из ядра доходит до узла и после набора.
	 */
	it('ref потребителя получает корень и не отнимает у поля его узел', async () => {
		const ctrl = new TInput()
		const nodes: Element[] = []
		const root = mount(() => <Input ctrl={ctrl} ref={(node) => nodes.push(node)} />).root()
		const input = field(root)

		expect(nodes).toHaveLength(1)
		expect(nodes[0]).toBe(root)

		await nextFrame()
		type(input, 'abc')

		ctrl.value = 'из кода'

		expect(input.value).toBe('из кода')
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

	it('без clearable кнопки нет, и обёртки у конца поля тоже', () => {
		const el = mount(() => <Input value="текст" />).root()

		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.querySelector('.so-input__trailing')).toBeNull()
	})

	it('по clearable — первой в обёртке у конца, перед содержимым trailing', () => {
		const el = mount(() => (
			<Input clearable name="Город" trailing={<i class="probe" />} />
		)).root()
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
		const { container } = mount(() => (
			<LocaleProvider locale={ruRU}>
				<Input clearable name="Город" />
			</LocaleProvider>
		))

		expect(clearOf(container).getAttribute('aria-label')).toBe('Очистить Город')
	})

	/**
	 * Кнопка — деталь разметки поля, а не кнопка отправки: у `<button>` без
	 * `type` тип `submit`, и в форме клик по очистке отправил бы её. Форму в
	 * браузере проверяет `playground/vue/browser/input.spec.ts`.
	 */
	it('type="button" — в форме она не кнопка отправки', () => {
		const el = mount(() => <Input clearable />).root()

		expect(clearOf(el).getAttribute('type')).toBe('button')
	})

	it('размер — поля, выключена — вместе с полем, readonly её не гасит', () => {
		const [disabled, setDisabled] = createSignal(false)
		const { root } = mount(() => <Input clearable size="lg" readonly disabled={disabled()} />)

		expect(clearOf(root()).classList.contains('so-button--size-lg')).toBe(true)
		expect(clearOf(root()).disabled).toBe(false)

		setDisabled(true)

		expect(clearOf(root()).disabled).toBe(true)
	})

	it('clearable после монтирования — кнопка появляется, снятый — уходит вместе с обёрткой', () => {
		const [clearable, setClearable] = createSignal(false)
		const { root } = mount(() => <Input clearable={clearable()} />)

		expect(root().querySelector('.so-input__trailing')).toBeNull()

		setClearable(true)

		expect(clearOf(root())).toBeInstanceOf(HTMLButtonElement)

		setClearable(false)

		expect(root().querySelector('.so-input__trailing')).toBeNull()
	})

	it('клик очищает поле и до корня не всплывает', async () => {
		const ctrl = new TInput({ value: 'текст' })
		const onChangeValue = vi.fn()
		const onActionPress = vi.fn()
		const view = mount(() => (
			<Input
				ctrl={ctrl}
				clearable
				onChangeValue={onChangeValue}
				onActionPress={onActionPress}
			/>
		))
		const outside = vi.fn()

		view.container.addEventListener('click', outside)

		// Кнопка очищает по клику своего TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		clearOf(view.root()).click()

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

		const el = mount(() => <Input ctrl={ctrl} clearable />).root()

		await nextFrame()

		clearOf(el).click()

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Своя кнопка заменяет встроенную целиком и рисуется, когда задана, — без
	 * `clearable`. Команду очистки она берёт из scope и зовёт голой функцией.
	 */
	it('своя кнопка — слот clear с командой очистки в scope', () => {
		const ctrl = new TInput({ value: 'текст' })
		const el = mount(() => (
			<Input
				ctrl={ctrl}
				clear={({ clear }: { clear: () => void }) => (
					<button type="button" class="probe" onClick={() => clear()} />
				)}
			/>
		)).root()

		expect(el.querySelector('.so-input__trailing > .probe')).not.toBeNull()
		expect(el.querySelector('.so-input__clear')).toBeNull()

		find(el, '.probe', HTMLButtonElement).click()

		expect(ctrl.value).toBe('')
		expect(field(el).value).toBe('')
	})

	it('своя кнопка при clearable — вместо встроенной; слот не атрибут', () => {
		const el = mount(() => <Input clearable clear={<b class="probe" />} />).root()

		expect(el.querySelector('.probe')).not.toBeNull()
		expect(el.querySelector('.so-input__clear')).toBeNull()
		expect(el.hasAttribute('clear')).toBe(false)
		expect(field(el).hasAttribute('clear')).toBe(false)
	})
})

describe('Input · типы', () => {
	/**
	 * Событие `input` дескриптора даёт колбэк `onInput` — то же имя, что у
	 * обработчика DOM. Пересечение с атрибутом свело бы их в функцию, которой
	 * не написать; `UseDomProps` вычитает имена событий из атрибутов, как
	 * пропсы и слоты. Проверяет не vitest, а шаг CI «Типы — Solid».
	 */
	it('onInput — колбэк события input дескриптора, а не обработчик DOM', () => {
		expectTypeOf<NonNullable<InputProps['onInput']>>().toEqualTypeOf<
			(payload: TValuePayload<string>) => void
		>()
	})

	/**
	 * Что поле ведёт само, атрибутом не задаётся: отметка, «выбрано частично» и
	 * `readOnly` — второй путь к входу `readonly`. Проверяет шаг CI «Типы — Solid».
	 */
	it('checked, prop:indeterminate и readOnly — не атрибуты; autocomplete и minlength — атрибуты', () => {
		expectTypeOf<InputProps>().not.toHaveProperty('checked')
		expectTypeOf<InputProps>().not.toHaveProperty('prop:indeterminate')
		expectTypeOf<InputProps>().not.toHaveProperty('readOnly')
		expectTypeOf<InputProps>().toHaveProperty('autocomplete')
		expectTypeOf<InputProps>().toHaveProperty('minlength')
	})
})
