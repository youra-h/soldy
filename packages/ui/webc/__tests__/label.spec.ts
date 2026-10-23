/**
 * `<label is="so-label">` — подпись вокруг контрола.
 *
 * Корень — сам `label` потребителя, внутри две части: контрол (слот `default`)
 * и текст (слот `content`, без него — проп `text`). Связи через `for` и `id`
 * нет: контрол — первый labelable-потомок `label`, поэтому клик по тексту
 * переключает его, а текст становится его доступным именем. Сценарии — те же,
 * что у React (`label.spec.tsx`), без сервера и `act`; радио у адаптера ещё
 * нет.
 *
 * Флажок переключает плагин по `change` поля, его слушатели встают по
 * `ready` узла — кадром позже.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { LabelDescriptor } from '@soldy-ui/setup'
import { TLabelElement, type TLabelElementProps } from '@soldy-ui/webc'
import { labelTemplate } from '../src/components/label/label.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isLabel(node: Element | null): node is TLabelElementProps {
	return node instanceof TLabelElement
}

/** Подпись из разметки; узел другой — тест падает здесь. */
function mount(html: string): TLabelElementProps {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)

	const node = host.querySelector('[is="so-label"]')

	if (!isLabel(node)) throw new Error('<label is="so-label"> нет')

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Значения `detail` событий с этим именем на элементе. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent) seen.push(event.detail)
	})

	return seen
}

const textOf = (root: Element) => find(root, '.so-label__text', HTMLElement)

describe('Label · разметка', () => {
	it('корень — label потребителя, внутри контрол, потом текст', () => {
		const el = mount(`<label is="so-label" text="Согласен">
			<span is="so-check-box"></span>
		</label>`)

		expect(el).toBeInstanceOf(HTMLLabelElement)
		expect([...el.classList]).toEqual([
			'so-label',
			'so-label--size-normal',
			'so-label--position-end',
		])
		expect([...el.children].map((part) => part.className)).toEqual([
			'so-label__control',
			'so-label__text',
		])
		expect(el.querySelector('.so-label__control > .so-check-box input')).not.toBeNull()
		expect(textOf(el).textContent).toBe('Согласен')
	})

	/** Тег задан разметкой: ядро получает `label`, атрибута `tag` у элемента нет. */
	it('тег у ядра — label', () => {
		expect(mount('<label is="so-label" tag="span"></label>').ctrl?.tag).toBe('label')
	})

	it('смена position меняет модификатор стороны', async () => {
		const el = mount('<label is="so-label" position="start"></label>')

		expect(el.classList.contains('so-label--position-start')).toBe(true)

		el.position = 'top'
		await flush()

		expect(el.classList.contains('so-label--position-top')).toBe(true)
		expect(el.classList.contains('so-label--position-start')).toBe(false)
	})

	it('direction: rtl — dir на корне подписи', () => {
		expect(mount('<label is="so-label" direction="rtl"></label>').getAttribute('dir')).toBe(
			'rtl',
		)
	})

	/** Все три набора ядра — на корне: подпись сама и есть элемент с ними. */
	it('атрибут потребителя — рядом с наборами ядра на корне', () => {
		const el = mount('<label is="so-label" class="own" title="Подсказка"></label>')

		expect(el.classList.contains('own')).toBe(true)
		expect(el.getAttribute('title')).toBe('Подсказка')
	})
})

describe('Label · текст: проп и слот', () => {
	it('без слота — проп text', () => {
		expect(textOf(mount('<label is="so-label" text="Проп"></label>')).textContent).toBe('Проп')
	})

	it('слот content переопределяет проп', () => {
		const el = mount('<label is="so-label" text="Проп"><b slot="content">Слот</b></label>')
		const text = textOf(el)

		expect(text.children).toHaveLength(1)
		expect(text.firstElementChild?.localName).toBe('b')
		expect(text.textContent).toBe('Слот')
	})

	it('смена пропа доходит до текста', async () => {
		const el = mount('<label is="so-label" text="До"></label>')

		el.text = 'После'
		await flush()

		expect(textOf(el).textContent).toBe('После')
	})

	/**
	 * Тема прячет пустую обёртку по `:empty`, а пробельный текст или узел
	 * вокруг слота этот селектор выключили бы: рядом с одиноким контролом
	 * остался бы зазор.
	 */
	it('без текста обёртка пуста — ни пробела, ни узла', () => {
		const el = mount(`<label is="so-label">
			<span is="so-check-box"></span>
		</label>`)

		expect(textOf(el).childNodes).toHaveLength(0)
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('label')
		const targets = labelTemplate.create(root, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			LabelDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

/** CheckBox и Switch устроены одинаково: корень-`span` и `<input type="checkbox">`. */
const CHECKABLES = [
	['CheckBox', 'so-check-box'],
	['Switch', 'so-switch'],
] as const

describe.each(CHECKABLES)('Label · %s в подписи', (_name, is) => {
	const markup = `<label is="so-label" text="Согласен">
		<span is="${is}"></span>
	</label>`

	it('у поля одна подпись — сама Label', () => {
		const el = mount(markup)

		expect([...(find(el, 'input', HTMLInputElement).labels ?? [])]).toEqual([el])
	})

	it('клик по тексту переключает контрол один раз: один change, одно so:change:value', async () => {
		const el = mount(markup)
		const control = find(el, `[is="${is}"]`, HTMLElement)
		const input = find(el, 'input', HTMLInputElement)
		const changes = collect(control, 'so:change:value')
		let native = 0

		input.addEventListener('change', () => native++)

		// Слушатель поля плагин вешает кадром позже, по `ready` узла
		await nextFrame()

		textOf(el).click()

		expect(input.checked).toBe(true)
		expect(native).toBe(1)
		expect(changes).toEqual([{ newValue: true, oldValue: false }])
	})
})
