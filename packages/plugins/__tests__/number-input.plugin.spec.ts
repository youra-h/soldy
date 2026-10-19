// @vitest-environment jsdom

/**
 * Плагины поля числа — набор, клавиши, кнопки шага и сенсорный режим — над
 * настоящим ядром.
 *
 * Разметку тест рисует сам, как фреймворк: корень, ввод, кнопки шага со своими
 * наборами и скрытое поле формы. Текст ввода перерисовка пишет, как
 * фреймворк, только когда сменился текст ядра: что браузер написал в ввод сам,
 * она не видит. jsdom действий браузера не выполняет — набор в ввод тест
 * пишет сам, как его написал бы браузер, — а удержание кнопки идёт на
 * поддельных таймерах. Настоящий ввод, отказ знака без сдвига каретки и
 * удержание мышью проверяет `playground/vue/browser/number-input.spec.ts`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { TNumberInput } from '@soldy-ui/core'
import type { INumberInputProps } from '@soldy-ui/core'
import {
	TElementPlugin,
	TNumberInputKeyboardPlugin,
	TNumberInputStepperPlugin,
	TNumberInputTouchPlugin,
	TNumberInputTypingPlugin,
	TPluginBundle,
} from '../src'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	Reflect.deleteProperty(navigator, 'maxTouchPoints')
	document.body.innerHTML = ''
})

/** Поле в документе с плагинами — как его собирает адаптер. */
async function mount(props: Partial<INumberInputProps> = {}) {
	const owner = new TNumberInput(props)
	const root = document.createElement('div')
	const input = document.createElement('input')
	const decrement = document.createElement('button')
	const increment = document.createElement('button')
	const icon = document.createElement('span')
	const slotted = document.createElement('input')
	const hidden = document.createElement('input')
	/** Текст ядра, который перерисовка написала в ввод последним */
	let written: string | undefined

	root.className = 'so-number-input'
	input.className = 'so-number-input__input'
	decrement.className = 'so-number-input__decrement'
	increment.className = 'so-number-input__increment'
	hidden.type = 'hidden'
	increment.append(icon)
	root.append(slotted, input, decrement, increment, hidden)
	document.body.append(document.createElement('button'), root)

	/** Разметка по выходам ядра: текст ввода — по смене, наборы кнопок — целиком. */
	const render = (): void => {
		if (written !== owner.text) {
			input.value = owner.text
			written = owner.text
		}

		for (const [button, dataset, disabled] of [
			[decrement, owner.decrementDataset.toObject(), owner.decrementDisabled],
			[increment, owner.incrementDataset.toObject(), owner.incrementDisabled],
		] as const) {
			button.disabled = disabled
			button.removeAttribute('data-pressed')

			for (const [name, value] of Object.entries(dataset)) {
				if (value !== null) button.setAttribute(name, value)
			}
		}
	}

	render()

	for (const event of [
		'change:text',
		'change:value',
		'change:incrementDataset',
		'change:decrementDataset',
		'change:disabled',
		'change:readonly',
	] as const) {
		owner.events.on(event, render)
	}

	const bundle = new TPluginBundle(owner, 'n1')
		.use(TElementPlugin)
		.use(TNumberInputTypingPlugin)
		.use(TNumberInputKeyboardPlugin)
		.use(TNumberInputStepperPlugin)
		.use(TNumberInputTouchPlugin)

	const element = bundle.get(TElementPlugin)

	if (!element) throw new Error('TElementPlugin не установлен')

	element.element = root
	await nextFrame()

	/** Правка браузера: `beforeinput`, а не отменили — текст в ввод и `input`. */
	const edit = (inputType: string, text: string, data: string | null = null): InputEvent => {
		const before = new InputEvent('beforeinput', {
			inputType,
			data,
			bubbles: true,
			cancelable: true,
		})

		input.dispatchEvent(before)

		if (!before.defaultPrevented) {
			input.value = text
			input.dispatchEvent(new InputEvent('input', { inputType, data, bubbles: true }))
		}

		return before
	}

	/** Набрать знак у каретки — в конец текста. */
	const type = (char: string): InputEvent => {
		input.setSelectionRange(input.value.length, input.value.length)

		return edit('insertText', input.value + char, char)
	}

	/** Нажатие с ввода, как у пользователя: событие всплывает до корня. */
	const press = (key: string, init: KeyboardEventInit = {}, from: Element = input) => {
		const event = new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		})

		from.dispatchEvent(event)

		return event
	}

	/** Указатель по узлу: событие всплывает до корня. */
	const pointer = (from: Element, type: string, init: PointerEventInit = {}): PointerEvent => {
		const event = new PointerEvent(type, {
			pointerType: 'mouse',
			button: 0,
			bubbles: true,
			cancelable: true,
			...init,
		})

		from.dispatchEvent(event)

		return event
	}

	return {
		owner,
		root,
		input,
		decrement,
		increment,
		icon,
		slotted,
		bundle,
		edit,
		type,
		press,
		pointer,
	}
}

describe('набор', () => {
	it('знак, который ядро возьмёт, проходит; текст и значение — в ядре', async () => {
		const { owner, input, type } = await mount({ locale: 'ru-RU' })

		for (const char of '12,5') expect(type(char).defaultPrevented).toBe(false)

		expect(input.value).toBe('12,5')
		expect(owner.text).toBe('12,5')
		expect(owner.value).toBe(12.5)
	})

	it('буква, второй разделитель и минус у поля без отрицательных — гасятся до правки', async () => {
		const { owner, input, type, edit } = await mount({ min: 0, value: 1.5 })

		expect(type('a').defaultPrevented).toBe(true)
		expect(type('.').defaultPrevented).toBe(true)

		input.setSelectionRange(0, 0)

		expect(edit('insertText', '-1.5', '-').defaultPrevented).toBe(true)
		expect(input.value).toBe('1.5')
		expect(owner.value).toBe(1.5)
	})

	it('вставка — вместо выделения; не число — гасится', async () => {
		const { owner, input, edit } = await mount({ value: 123 })

		input.setSelectionRange(1, 2)

		expect(edit('insertFromPaste', '173', '7').defaultPrevented).toBe(false)
		expect(owner.value).toBe(173)

		input.setSelectionRange(0, 3)

		expect(edit('insertFromPaste', 'abc', 'abc').defaultPrevented).toBe(true)
		expect(owner.value).toBe(173)
	})

	it('стирание у каретки и выделения считается до правки', async () => {
		const { owner, input, edit } = await mount({ value: -5, min: -10 })

		// «-5» без пятёрки — «-»: недописанное годится, значение пусто
		input.setSelectionRange(2, 2)

		expect(edit('deleteContentBackward', '-').defaultPrevented).toBe(false)
		expect(owner.value).toBeUndefined()
		expect(owner.text).toBe('-')
	})

	it('отмена, повтор и перевод строки — мимо проверки', async () => {
		const { input } = await mount({ min: 0 })

		for (const inputType of ['historyUndo', 'historyRedo', 'insertLineBreak']) {
			const event = new InputEvent('beforeinput', {
				inputType,
				data: '-',
				bubbles: true,
				cancelable: true,
			})

			input.dispatchEvent(event)

			expect(event.defaultPrevented).toBe(false)
		}
	})

	it('ядро отказало — узел получает текст ядра обратно', async () => {
		const { owner, input } = await mount({ value: 5 })

		owner.events.on('change:value:before', (e) => e.preventDefault())
		input.value = '7'
		input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))

		expect(input.value).toBe('5')
		expect(owner.value).toBe(5)
	})

	it('правка мимо beforeinput, которую ядро не берёт, — тоже назад', async () => {
		const { owner, input } = await mount({ value: 5 })

		input.value = '5x'
		input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))

		expect(input.value).toBe('5')
		expect(owner.text).toBe('5')
	})

	it('композиция — набранное уходит ядру на compositionend', async () => {
		const { owner, input } = await mount()

		input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
		input.value = '１２'
		input.dispatchEvent(
			new InputEvent('input', { inputType: 'insertCompositionText', bubbles: true }),
		)

		expect(owner.value).toBeUndefined()

		input.dispatchEvent(new CompositionEvent('compositionend', { data: '１２', bubbles: true }))

		expect(owner.value).toBe(12)
	})

	it('уход фокуса с ввода — commit: значение с точностью формата, текст формата', async () => {
		const { owner, input, type } = await mount()
		const commit = vi.fn()

		owner.events.on('commit', commit)

		for (const char of '1234.56789') type(char)

		input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

		expect(owner.value).toBe(1234.568)
		expect(input.value).toBe(owner.text)
		expect(owner.text).toBe(new Intl.NumberFormat('en-US').format(1234.568))
		expect(commit).toHaveBeenCalledTimes(1)
	})

	it('правки поля в слоте плагин не трогает', async () => {
		const { owner, slotted } = await mount({ value: 5 })
		const event = new InputEvent('beforeinput', {
			inputType: 'insertText',
			data: 'a',
			bubbles: true,
			cancelable: true,
		})

		slotted.dispatchEvent(event)
		slotted.value = 'a'
		slotted.dispatchEvent(new InputEvent('input', { bubbles: true }))

		expect(event.defaultPrevented).toBe(false)
		expect(owner.value).toBe(5)
	})
})

describe('клавиши', () => {
	it('↑/↓ — шаг и commit; клавиша гасится', async () => {
		const { owner, press } = await mount({ value: 5 })
		const commit = vi.fn()

		owner.events.on('commit', commit)

		expect(press('ArrowUp').defaultPrevented).toBe(true)
		expect(owner.value).toBe(6)

		press('ArrowDown')
		press('ArrowDown')

		expect(owner.value).toBe(4)
		expect(commit).toHaveBeenCalledTimes(3)
	})

	it('Shift со стрелкой, PageUp и PageDown — крупный шаг', async () => {
		const { owner, press } = await mount({ value: 0, largeStep: 5 })

		press('ArrowUp', { shiftKey: true })

		expect(owner.value).toBe(5)

		press('PageUp')

		expect(owner.value).toBe(10)

		expect(press('PageDown').defaultPrevented).toBe(true)
		expect(owner.value).toBe(5)
	})

	it('Home и End — к заданной границе; без границы и с Shift — каретки', async () => {
		const { owner, press } = await mount({ value: 5, min: 1 })

		expect(press('Home').defaultPrevented).toBe(true)
		expect(owner.value).toBe(1)

		// `max` не задан — End двигает каретку
		expect(press('End').defaultPrevented).toBe(false)
		expect(press('Home', { shiftKey: true }).defaultPrevented).toBe(false)
	})

	it('Enter — commit без preventDefault: форма уйдёт с законченным числом', async () => {
		const { owner, type, press } = await mount()

		for (const char of '1.23456') type(char)

		expect(press('Enter').defaultPrevented).toBe(false)
		expect(owner.value).toBe(1.235)
	})

	it('Alt, Ctrl, Meta, композиция и клавиши поля в слоте — не поля числа', async () => {
		const { owner, press, slotted } = await mount({ value: 5 })

		press('ArrowUp', { altKey: true })
		press('ArrowUp', { ctrlKey: true })
		press('ArrowUp', { metaKey: true })
		press('ArrowUp', { isComposing: true })

		expect(press('ArrowUp', {}, slotted).defaultPrevented).toBe(false)
		expect(owner.value).toBe(5)
	})
})

describe('кнопки шага', () => {
	it('нажатие мышью: шаг сразу, фокус во ввод, нажатие погашено, data-pressed', async () => {
		const { owner, input, increment, pointer } = await mount({ value: 5 })

		const down = pointer(increment, 'pointerdown')

		expect(down.defaultPrevented).toBe(true)
		expect(owner.value).toBe(6)
		expect(document.activeElement).toBe(input)
		expect(increment.getAttribute('data-pressed')).toBe('true')

		pointer(increment, 'pointerup')

		expect(increment.hasAttribute('data-pressed')).toBe(false)
	})

	it('палец фокус во ввод не ставит', async () => {
		const { increment, pointer } = await mount({ value: 5 })

		pointer(increment, 'pointerdown', { pointerType: 'touch' })

		expect(document.activeElement).toBe(document.body)
	})

	it('удержание: повтор после задержки — до края, одно commit на всё', async () => {
		const { owner, increment, pointer } = await mount({ value: 5, max: 10 })
		const commit = vi.fn()

		owner.events.on('commit', commit)
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		pointer(increment, 'pointerdown')

		expect(owner.value).toBe(6)

		vi.advanceTimersByTime(399)

		expect(owner.value).toBe(6)

		vi.advanceTimersByTime(1)

		expect(owner.value).toBe(7)

		vi.advanceTimersByTime(60)

		expect(owner.value).toBe(8)

		vi.advanceTimersByTime(1000)

		// У края кнопка выключилась, и удержание кончилось
		expect(owner.value).toBe(10)
		expect(owner.incrementDisabled).toBe(true)
		expect(increment.hasAttribute('data-pressed')).toBe(false)
		expect(commit).toHaveBeenCalledTimes(1)
		expect(commit).toHaveBeenCalledWith({ newValue: 10, oldValue: 5 })
	})

	it('удержание кончают отпускание, отмена указателя и уход с кнопки', async () => {
		const { owner, increment, icon, root, pointer } = await mount({ value: 0 })

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		for (const end of [
			() => pointer(increment, 'pointerup'),
			() => pointer(increment, 'pointercancel'),
			() => pointer(increment, 'pointerout', { relatedTarget: root }),
		]) {
			const before = owner.value ?? 0

			pointer(increment, 'pointerdown')
			// Указатель над значком кнопки — всё ещё над ней: повтор идёт
			pointer(increment, 'pointerout', { relatedTarget: icon })
			vi.advanceTimersByTime(400)

			expect(owner.value).toBe(before + 2)

			end()
			vi.advanceTimersByTime(1000)

			expect(owner.value).toBe(before + 2)
			expect(increment.hasAttribute('data-pressed')).toBe(false)
		}
	})

	it('выключили поле под удержанием и сняли узел — удержание кончено', async () => {
		const disabled = await mount({ value: 0 })

		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

		disabled.pointer(disabled.increment, 'pointerdown')
		disabled.owner.disabled = true
		vi.advanceTimersByTime(1000)

		expect(disabled.owner.value).toBe(1)
		expect(disabled.increment.hasAttribute('data-pressed')).toBe(false)

		const removed = await mount({ value: 0 })
		const commit = vi.fn()

		removed.owner.events.on('commit', commit)
		removed.pointer(removed.increment, 'pointerdown')
		const element = removed.bundle.get(TElementPlugin)

		if (element) element.element = null
		vi.advanceTimersByTime(1000)

		expect(removed.owner.value).toBe(1)
		expect(commit).toHaveBeenCalledTimes(1)
	})

	it('выключенная кнопка нажатие не гасит и не шагает; не основная кнопка мыши — тоже', async () => {
		const { owner, increment, decrement, pointer } = await mount({ value: 10, max: 10 })

		expect(pointer(increment, 'pointerdown').defaultPrevented).toBe(false)
		expect(owner.value).toBe(10)

		expect(pointer(decrement, 'pointerdown', { button: 2 }).defaultPrevented).toBe(false)
		expect(owner.value).toBe(10)
	})

	it('click без указателя (скринридер) — шаг и commit; клик мышью — нет', async () => {
		const { owner, decrement } = await mount({ value: 5 })
		const commit = vi.fn()

		owner.events.on('commit', commit)
		decrement.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }))

		expect(owner.value).toBe(4)
		expect(commit).toHaveBeenCalledTimes(1)

		decrement.dispatchEvent(new MouseEvent('click', { detail: 1, bubbles: true }))

		expect(owner.value).toBe(4)
	})

	it('контекстное меню над кнопкой гасится', async () => {
		const { icon } = await mount()
		const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })

		icon.dispatchEvent(event)

		expect(event.defaultPrevented).toBe(true)
	})
})

/**
 * Платформа устройства на время теста: `navigator.platform` и число точек
 * касания. У jsdom `maxTouchPoints` нет вовсе.
 */
function emulatePlatform(platform: string, maxTouchPoints = 0): void {
	vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
	Object.defineProperty(navigator, 'maxTouchPoints', {
		value: maxTouchPoints,
		configurable: true,
	})
}

describe('сенсорные устройства Apple', () => {
	it('роль textbox, клавиатура с минусом — текстовая, пока минус разрешён', async () => {
		emulatePlatform('iPhone', 5)

		const { owner } = await mount()

		expect(owner.inputAria.role).toBe('textbox')
		expect(owner.inputAria['aria-valuenow']).toBeNull()
		expect(owner.inputAttrs.inputmode).toBe('text')

		owner.min = 0

		expect(owner.inputAttrs.inputmode).toBe('decimal')
	})

	it('iPad называет себя Mac: отличает его сенсорный экран', async () => {
		emulatePlatform('MacIntel', 5)

		const { owner } = await mount()

		expect(owner.inputAria.role).toBe('textbox')
	})

	it('компьютер — счётчик с клавиатурой ядра', async () => {
		emulatePlatform('MacIntel', 0)

		const { owner } = await mount({ value: 5 })

		expect(owner.inputAria.role).toBe('spinbutton')
		expect(owner.inputAttrs.inputmode).toBe('decimal')
	})

	it('после destroy() набор поля пуст: поле переживает монтирование', async () => {
		emulatePlatform('iPhone', 5)

		const { owner, bundle } = await mount()

		bundle.destroy()

		expect(owner.inputSets.aria.toObject()).toEqual({})
		expect(owner.inputSets.attrs.toObject()).toEqual({})
	})
})
