/**
 * Label в Solid: подпись вокруг контрола.
 *
 * Корень — `label`, внутри две части: контрол (`children`, слот `default`) и
 * текст (слот `content`, без него — проп `text`). Связи через `for` и `id`
 * нет: контрол — первый labelable-потомок `label`, поэтому клик по тексту
 * переключает его, а текст становится его доступным именем. Сценарии — те
 * же, что у React (`label.spec.tsx`) и Vue (`label.spec.ts`); радио в подписи
 * придёт с RadioGroup — в Solid его пока нет.
 *
 * Слот `content` назван не `text`: в Solid слот — это проп, и одноимённый с
 * пропом `text` слился бы с ним.
 */

import { describe, it, expect, vi } from 'vitest'
import { createSignal, type JSX } from 'solid-js'
import type { TLabelPosition } from '@soldy-ui/core'
import { CheckBox, Label, Switch, type SwitchProps } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

describe('Label · разметка', () => {
	it('корень — label, внутри контрол, потом текст', () => {
		const el = mount(() => (
			<Label text="Согласен">
				<CheckBox />
			</Label>
		)).root()

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
		expect(mount(() => <Label tag="span" />).root().localName).toBe('span')
	})

	it('смена position меняет модификатор стороны', () => {
		const [position, setPosition] = createSignal<TLabelPosition>('start')
		const { root } = mount(() => <Label position={position()} />)

		expect(root().classList.contains('s-label--position-start')).toBe(true)

		setPosition('top')

		expect(root().classList.contains('s-label--position-top')).toBe(true)
		expect(root().classList.contains('s-label--position-start')).toBe(false)
	})

	it('direction: rtl — dir на корне подписи', () => {
		const el = mount(() => <Label direction="rtl" />).root()

		expect(el.getAttribute('dir')).toBe('rtl')
	})
})

describe('Label · текст: проп и слот', () => {
	const textOf = (root: HTMLElement) => find(root, '.s-label__text', HTMLElement)

	it('без слота — проп text', () => {
		expect(textOf(mount(() => <Label text="Проп" />).root()).textContent).toBe('Проп')
	})

	it('слот content переопределяет проп', () => {
		const el = mount(() => <Label text="Проп" content={<b>Слот</b>} />).root()

		expect(textOf(el).innerHTML).toBe('<b>Слот</b>')
	})

	it('слот content — не атрибут корня', () => {
		const el = mount(() => <Label content={<b>Слот</b>} />).root()

		expect(el.hasAttribute('content')).toBe(false)
	})

	it('смена пропа доходит до текста', () => {
		const [text, setText] = createSignal('До')
		const { root } = mount(() => <Label text={text()} />)

		setText('После')

		expect(textOf(root()).textContent).toBe('После')
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или узел
	 * вокруг слота этот селектор выключили бы: рядом с одиноким контролом
	 * остался бы зазор.
	 */
	it('без текста обёртка пуста — ни пробела, ни узла', () => {
		expect(textOf(mount(() => <Label />).root()).childNodes).toHaveLength(0)
	})

	/**
	 * Снятый текст Solid оставил бы пустым текстовым узлом — разметка его не
	 * рисует вовсе, как и пустой с первой отрисовки.
	 */
	it('текст, снятый до пустого, обёртку тоже не держит', () => {
		const [text, setText] = createSignal('Есть')
		const { root } = mount(() => <Label text={text()} />)

		setText('')

		expect(textOf(root()).childNodes).toHaveLength(0)
		expect(textOf(root()).matches(':empty')).toBe(true)
	})

	/** Слот разворачивается один раз: проверка «задан ли слот» не рисует второй экземпляр. */
	it('слот content — один экземпляр, смена текста его не пересоздаёт', () => {
		const [text, setText] = createSignal('a')
		const el = mount(() => <Label text={text()} content={<b>Слот</b>} />).root()
		const node = el.querySelector('.s-label__text b')

		expect(el.querySelectorAll('b')).toHaveLength(1)

		setText('b')

		expect(el.querySelector('.s-label__text b')).toBe(node)
	})
})

/** Колбэк смены значения контрола — одного типа у CheckBox и Switch. */
type TOnValue = SwitchProps['onChangeValue']

/** CheckBox и Switch устроены одинаково: корень-`span` и `<input type="checkbox">`. */
const CHECKABLES: ReadonlyArray<readonly [string, (onChangeValue?: TOnValue) => JSX.Element]> = [
	['CheckBox', (onChangeValue) => <CheckBox onChangeValue={onChangeValue} />],
	['Switch', (onChangeValue) => <Switch onChangeValue={onChangeValue} />],
]

describe.each(CHECKABLES)('Label · %s в подписи', (_name, control) => {
	it('у поля одна подпись — сама Label', () => {
		const el = mount(() => <Label text="Согласен">{control()}</Label>).root()
		const input = find(el, 'input', HTMLInputElement)

		expect([...(input.labels ?? [])]).toEqual([el])
	})

	it('клик по тексту переключает контрол один раз', async () => {
		const onChangeValue = vi.fn()
		const el = mount(() => <Label text="Согласен">{control(onChangeValue)}</Label>).root()

		// Слушатель поля плагин вешает кадром позже, по `ready` узла
		await nextFrame()

		find(el, '.s-label__text', HTMLElement).click()

		expect(find(el, 'input', HTMLInputElement).checked).toBe(true)
		expect(onChangeValue.mock.calls).toEqual([[{ newValue: true, oldValue: false }]])
	})
})
