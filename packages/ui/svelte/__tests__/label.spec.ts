/**
 * Label в Svelte: подпись вокруг контрола.
 *
 * Корень — `label`, внутри две части: контрол (`children`, слот `default`) и
 * текст (слот `content`, без него — проп `text`). Связи через `for` и `id`
 * нет: контрол — первый labelable-потомок `label`, поэтому клик по тексту
 * переключает его, а текст становится его доступным именем. Сценарии — те
 * же, что у React (`label.spec.tsx`) и Vue (`label.spec.ts`), в том числе
 * радио в подписи.
 *
 * Слот `content` назван не `text`: в Svelte слот — это проп, и одноимённый с
 * пропом `text` слился бы с ним.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { Label, type LabelProps, type SwitchProps } from '@soldy-ui/svelte'
import LabelControl from './LabelControl.test.svelte'
import LabelRadio from './LabelRadio.test.svelte'
import { contentOf, find, htmlOf, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('Label · разметка', () => {
	it('корень — label, внутри контрол, потом текст', () => {
		const el = mount(LabelControl, { control: 'check-box', text: 'Согласен' }).root()

		expect(el.localName).toBe('label')
		expect([...el.classList]).toEqual([
			's-label',
			's-label--size-normal',
			's-label--position-end',
		])
		expect([...el.children].map((part) => part.className)).toEqual([
			's-label__control',
			's-label__text',
		])
		expect(el.querySelector('.s-label__control > .s-check-box input')).not.toBeNull()
		expect(find(el, '.s-label__text', HTMLElement).textContent).toBe('Согласен')
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(Label, { tag: 'span' }).root().localName).toBe('span')
	})

	it('смена position меняет модификатор стороны', () => {
		const props = reactiveProps<LabelProps>({ position: 'start' })
		const { root } = mount(Label, props)

		expect(root().classList.contains('s-label--position-start')).toBe(true)

		props.position = 'top'
		flushSync()

		expect(root().classList.contains('s-label--position-top')).toBe(true)
		expect(root().classList.contains('s-label--position-start')).toBe(false)
	})

	it('direction: rtl — dir на корне подписи', () => {
		const el = mount(Label, { direction: 'rtl' }).root()

		expect(el.getAttribute('dir')).toBe('rtl')
	})
})

describe('Label · текст: проп и слот', () => {
	const textOf = (root: HTMLElement) => find(root, '.s-label__text', HTMLElement)

	/** Содержимое слота `content`. */
	const bold = createRawSnippet(() => ({ render: () => '<b>Слот</b>' }))

	it('без слота — проп text', () => {
		expect(textOf(mount(Label, { text: 'Проп' }).root()).textContent).toBe('Проп')
	})

	it('слот content переопределяет проп', () => {
		const el = mount(Label, { text: 'Проп', content: bold }).root()

		expect(htmlOf(textOf(el))).toBe('<b>Слот</b>')
	})

	it('слот content — не атрибут корня', () => {
		const el = mount(Label, { content: bold }).root()

		expect(el.hasAttribute('content')).toBe(false)
	})

	it('смена пропа доходит до текста', () => {
		const props = reactiveProps<LabelProps>({ text: 'До' })
		const { root } = mount(Label, props)

		props.text = 'После'
		flushSync()

		expect(textOf(root()).textContent).toBe('После')
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или узел
	 * вокруг слота этот селектор выключили бы: рядом с одиноким контролом
	 * остался бы зазор. Метку блока Svelte — комментарий — `:empty` не видит.
	 */
	it('без текста обёртка пуста — ни пробела, ни узла', () => {
		const text = textOf(mount(Label, {}).root())

		expect(contentOf(text)).toEqual([])
		expect(text.matches(':empty')).toBe(true)
	})

	it('текст, снятый до пустого, обёртку тоже не держит', () => {
		const props = reactiveProps<LabelProps>({ text: 'Есть' })
		const { root } = mount(Label, props)

		props.text = ''
		flushSync()

		expect(textOf(root()).matches(':empty')).toBe(true)
	})
})

/** Колбэк смены значения контрола — одного типа у CheckBox и Switch. */
type TOnValue = SwitchProps['onChangeValue']

/** CheckBox и Switch устроены одинаково: корень-`span` и `<input type="checkbox">`. */
const CHECKABLES = ['check-box', 'switch'] as const

describe.each(CHECKABLES)('Label · %s в подписи', (control) => {
	const view = (onChangeValue?: TOnValue) =>
		mount(LabelControl, { control, text: 'Согласен', onChangeValue })

	it('у поля одна подпись — сама Label', () => {
		const el = view().root()
		const input = find(el, 'input', HTMLInputElement)

		expect(input.labels).toHaveLength(1)
		expect(input.labels?.[0]).toBe(el)
	})

	it('клик по тексту переключает контрол один раз', async () => {
		const onChangeValue = vi.fn()
		const el = view(onChangeValue).root()

		// Слушатель поля плагин вешает кадром позже, по `ready` узла
		await nextFrame()

		find(el, '.s-label__text', HTMLElement).click()
		flushSync()

		expect(find(el, 'input', HTMLInputElement).checked).toBe(true)
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: true, oldValue: false }]])
	})
})

describe('Label · радио в подписи', () => {
	/** Тексты предупреждений подписи о вложенном `label`. */
	const nestedWarnings = (calls: readonly unknown[][]): string[] =>
		calls.map(([message]) => String(message)).filter((text) => text.includes('[soldy] Label'))

	it('без tag="span" — предупреждение о вложенном label', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mount(LabelRadio, {})

		// Плагин смотрит узел по `ready`, то есть кадром позже
		await nextFrame()

		const warnings = nestedWarnings(warn.mock.calls)

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('tag="span"')
	})

	it('с tag="span" — тишина, у радио одна подпись, клик по тексту его отмечает', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const onChangeValue = vi.fn()
		const el = mount(LabelRadio, { tag: 'span', onChangeValue }).root()

		await nextFrame()

		const label = find(el, '.s-label', HTMLLabelElement)
		const input = find(label, 'input', HTMLInputElement)

		expect(nestedWarnings(warn.mock.calls)).toEqual([])
		expect([...(input.labels ?? [])]).toEqual([label])

		find(label, '.s-label__text', HTMLElement).click()
		flushSync()

		expect(input.checked).toBe(true)
		expect(onChangeValue).toHaveBeenLastCalledWith({ newValue: 'a', oldValue: undefined })
	})
})
