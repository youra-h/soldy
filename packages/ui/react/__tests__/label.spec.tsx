/**
 * Label в React: подпись вокруг контрола.
 *
 * Корень — `label`, внутри две части: контрол (`children`, слот `default`) и
 * текст (слот `content`, без него — проп `text`). Связи через `for` и `id`
 * нет: контрол — первый labelable-потомок `label`, поэтому клик по тексту
 * переключает его, а текст становится его доступным именем. Сценарии — те
 * же, что у Vue (`label.spec.ts`); CheckBox и Switch в React ещё нет, их место
 * занимает нативное поле.
 *
 * Слот `content` назван не `text`: в React слот — это проп, и одноимённый с
 * пропом `text` слился бы с ним. `content` при этом ещё и атрибут RDFa в
 * `HTMLAttributes` — тип пропсов вычитает его, как проп дескриптора, и в DOM
 * он не уходит.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { Label } from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

afterEach(() => {
	vi.restoreAllMocks()
})

describe('Label · разметка', () => {
	it('корень — label, внутри контрол, потом текст', () => {
		const el = mount(
			<Label text="Согласен">
				<input type="checkbox" />
			</Label>,
		).root()

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
		expect(el.querySelector('.s-label__control > input')).not.toBeNull()
		expect(find(el, '.s-label__text', HTMLElement).textContent).toBe('Согласен')
	})

	it('tag рисует корень другим тегом', () => {
		expect(mount(<Label tag="span" />).root().localName).toBe('span')
	})

	it('смена position меняет модификатор стороны', () => {
		const { root, render } = mount(<Label position="start" />)

		expect(root().classList.contains('s-label--position-start')).toBe(true)

		render(<Label position="top" />)

		expect(root().classList.contains('s-label--position-top')).toBe(true)
		expect(root().classList.contains('s-label--position-start')).toBe(false)
	})

	it('direction: rtl — dir на корне подписи', () => {
		const el = mount(<Label direction="rtl" />).root()

		expect(el.getAttribute('dir')).toBe('rtl')
	})
})

describe('Label · текст: проп и слот', () => {
	const textOf = (root: HTMLElement) => find(root, '.s-label__text', HTMLElement)

	it('без слота — проп text', () => {
		expect(textOf(mount(<Label text="Проп" />).root()).textContent).toBe('Проп')
	})

	it('слот content переопределяет проп', () => {
		const el = mount(<Label text="Проп" content={<b>Слот</b>} />).root()

		expect(textOf(el).innerHTML).toBe('<b>Слот</b>')
	})

	it('слот content — не атрибут корня', () => {
		const el = mount(<Label content={<b>Слот</b>} />).root()

		expect(el.hasAttribute('content')).toBe(false)
	})

	it('смена пропа доходит до текста', () => {
		const { root, render } = mount(<Label text="До" />)

		render(<Label text="После" />)

		expect(textOf(root()).textContent).toBe('После')
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или узел
	 * вокруг слота этот селектор выключили бы: рядом с одиноким контролом
	 * остался бы зазор.
	 */
	it('без текста обёртка пуста — ни пробела, ни узла', () => {
		expect(textOf(mount(<Label />).root()).childNodes).toHaveLength(0)
	})
})

describe('Label · поле в подписи', () => {
	it('у поля одна подпись — сама Label', () => {
		const el = mount(
			<Label text="Согласен">
				<input type="checkbox" />
			</Label>,
		).root()

		const input = find(el, 'input', HTMLInputElement)

		expect([...(input.labels ?? [])]).toEqual([el])
	})

	it('клик по тексту переключает поле один раз', () => {
		const onChange = vi.fn()
		const el = mount(
			<Label text="Согласен">
				<input type="checkbox" onChange={onChange} />
			</Label>,
		).root()

		find(el, '.s-label__text', HTMLElement).click()

		expect(find(el, 'input', HTMLInputElement).checked).toBe(true)
		expect(onChange).toHaveBeenCalledTimes(1)
	})
})

describe('Label · вложенный label', () => {
	/** Тексты предупреждений подписи о вложенном `label`. */
	const nestedWarnings = (calls: readonly unknown[][]): string[] =>
		calls.map(([message]) => String(message)).filter((text) => text.includes('[soldy] Label'))

	it('вложенный label — предупреждение плагина подписи', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mount(
			<Label text="Первый">
				<label>
					<input type="radio" />
				</label>
			</Label>,
		)

		// Плагин смотрит узел по `ready`, то есть кадром позже
		await nextFrame()

		const warnings = nestedWarnings(warn.mock.calls)

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('tag="span"')
	})

	it('без вложенного label — тишина', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mount(
			<Label text="Первый">
				<span>
					<input type="radio" />
				</span>
			</Label>,
		)

		await nextFrame()

		expect(nestedWarnings(warn.mock.calls)).toEqual([])
	})
})
