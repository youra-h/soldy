/**
 * Имена событий элемента.
 *
 * Событие ядра уходит `CustomEvent` с элемента потребителя и всплывает: его
 * слышат форма, документ и всё, что слушает DOM. Имя события — `so:` и полное
 * имя ядра, у каждого события без исключений: `so:show` рядом с
 * `so:show:before` и `so:change:disabled`. Префикс говорит, чьё это событие, и
 * стоит у всей категории, а не у тех имён, что совпали бы с событием браузера:
 * потребителю не нужно знать, у каких событий он есть. Разделитель — `:`, как
 * между частями имени ядра.
 *
 * Перебираются дескрипторы экспорта `@soldy-ui/setup`, а не элементы адаптера:
 * под проверку сразу попадают и непортированные — поля с `input`, Select с
 * `open` и `close`, коллекции с `reset`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import * as setup from '@soldy-ui/setup'
import {
	ButtonDescriptor,
	InputDescriptor,
	ListBoxCollectionDescriptor,
	SelectDescriptor,
	TSurface,
	type IComponentDescriptor,
} from '@soldy-ui/setup'
import { TButtonElement, WebcProfile, type TButtonElementProps } from '@soldy-ui/webc'

/** `TElementPlugin` объявляет узел через кадр — после него ядро шлёт `ready`. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

function isComponentDescriptor(value: unknown): value is IComponentDescriptor {
	return typeof value === 'object' && value !== null && 'getProps' in value && 'plugins' in value
}

/**
 * Дескрипторы компонентов из экспорта `@soldy-ui/setup` — не ручным списком:
 * новый попадёт под проверку сам. Фабрика дескриптора — `<Имя>Descriptor` с
 * заглавной; определения плагинов отсеиваются — у них нет `getProps`.
 */
function exportedDescriptors(): (readonly [name: string, descriptor: IComponentDescriptor])[] {
	const entries: Record<string, unknown> = setup
	const result: (readonly [string, IComponentDescriptor])[] = []

	for (const [name, factory] of Object.entries(entries)) {
		if (!/^[A-Z]\w*Descriptor$/.test(name) || typeof factory !== 'function') continue

		const value: unknown = factory()

		if (isComponentDescriptor(value)) result.push([name, value])
	}

	return result
}

/** Имена, под которыми элемент шлёт события дескриптора. */
const eventNames = (descriptor: IComponentDescriptor): readonly string[] =>
	TSurface.of(descriptor, WebcProfile).events.map(({ exportName }) => exportName)

/**
 * События DOM, которые знает jsdom, — по обработчикам-свойствам (`oninput`)
 * элемента, формы, документа и окна: всплывшее событие доходит до всех них.
 */
function domEvents(): ReadonlySet<string> {
	const targets: object[] = [
		document.createElement('div'),
		document.createElement('form'),
		document,
		window,
	]
	const names = new Set<string>()

	for (const target of targets) {
		for (const key in target) if (key.startsWith('on')) names.add(key.slice(2))
	}

	return names
}

function isButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy, ещё не подключённая; `ctrl` — до подключения. */
function createButton(ctrl?: TButton): TButtonElementProps {
	const node = document.createElement('button', { is: 'so-button' })

	if (!isButton(node)) throw new Error('<button is="so-button"> нет')

	if (ctrl) node.ctrl = ctrl

	return node
}

/** Имена и `detail` событий с этими именами — в порядке прихода. */
function collect(target: EventTarget, names: readonly string[]): [string, unknown][] {
	const seen: [string, unknown][] = []

	for (const name of names) {
		target.addEventListener(name, (event) => {
			seen.push([name, event instanceof CustomEvent ? event.detail : undefined])
		})
	}

	return seen
}

/** Имена событий в порядке прихода — без `detail`. */
const namesOf = (seen: readonly [string, unknown][]): string[] => seen.map(([name]) => name)

/**
 * Прежние имена тех же событий: имя ядра без префикса и `so-` у события из
 * одного слова — так их отдавал первый заход. Ни одно больше не приходит.
 */
const LEGACY = [
	'show',
	'hide',
	'ready',
	'show:before',
	'hide:before',
	'change:visible',
	'change:disabled',
	'element:ready',
	'so-show',
	'so-hide',
	'so-ready',
]

afterEach(() => {
	document.body.innerHTML = ''
})

describe('имя события · so: и полное имя ядра', () => {
	const descriptors = exportedDescriptors()
	const events = domEvents()

	it('сверка не впустую: input и reset — события DOM, дескрипторы найдены', () => {
		expect(events.has('input')).toBe(true)
		expect(events.has('reset')).toBe(true)
		expect(descriptors.map(([name]) => name)).toEqual(
			expect.arrayContaining([
				'ButtonDescriptor',
				'InputDescriptor',
				'SelectDescriptor',
				'ListBoxCollectionDescriptor',
			]),
		)
		expect(eventNames(InputDescriptor())).toEqual(
			expect.arrayContaining(['so:input', 'so:input:value', 'so:change:value']),
		)
		expect(eventNames(SelectDescriptor())).toEqual(
			expect.arrayContaining(['so:open', 'so:close']),
		)
		expect(eventNames(ListBoxCollectionDescriptor())).toContain('so:reset')
	})

	it('каждое имя каждого дескриптора — so: и полное имя ядра', () => {
		const wrong = descriptors.flatMap(([name, descriptor]) =>
			TSurface.of(descriptor, WebcProfile).events.flatMap(({ name: event, exportName }) =>
				exportName === `so:${event.getName()}`
					? []
					: [`${name}: ${event.getName()} → ${exportName}`],
			),
		)

		expect(wrong).toEqual([])
	})

	/** Так события кнопки видит потребитель: схема одна, и без префикса нет ни одного. */
	it('Button: событие из одного слова и составное — под одной схемой', () => {
		const names = eventNames(ButtonDescriptor())

		expect(names).toEqual(
			expect.arrayContaining([
				'so:show',
				'so:show:before',
				'so:hide',
				'so:ready',
				'so:element:ready',
				'so:action:press',
				'so:action:click',
				'so:change:visible',
				'so:change:disabled',
			]),
		)
		expect(names.filter((name) => !name.startsWith('so:'))).toEqual([])
	})

	it('ни одно имя события ни одного дескриптора не совпадает с событием DOM', () => {
		const clashes = descriptors.flatMap(([name, descriptor]) =>
			eventNames(descriptor)
				.filter((event) => events.has(event))
				.map((event) => `${name}: ${event}`),
		)

		expect(clashes).toEqual([])
	})
})

describe('кнопка · события приходят под so:', () => {
	it('hide и show ядра — so:hide и so:show, рядом so:*:before и so:change:visible', () => {
		const ctrl = new TButton()
		const el = createButton(ctrl)

		document.body.appendChild(el)

		const seen = collect(el, [
			'so:hide:before',
			'so:hide',
			'so:show:before',
			'so:show',
			'so:change:visible',
		])

		ctrl.hide()
		ctrl.show()

		expect(namesOf(seen)).toEqual([
			'so:hide:before',
			'so:change:visible',
			'so:hide',
			'so:show:before',
			'so:change:visible',
			'so:show',
		])
		expect(seen.filter(([name]) => name === 'so:change:visible')).toEqual([
			['so:change:visible', false],
			['so:change:visible', true],
		])
	})

	it('смена свойства — so:change:<свойство> с тем, что шлёт ядро', () => {
		const ctrl = new TButton()
		const el = createButton(ctrl)

		document.body.appendChild(el)

		const seen = collect(el, ['so:change:disabled', 'so:change:text'])

		ctrl.disabled = true
		ctrl.text = 'Сохранить'

		expect(seen).toEqual([
			['so:change:disabled', true],
			['so:change:text', { newValue: 'Сохранить', oldValue: '' }],
		])
	})

	it('ready ядра — so:ready со значением, узел — so:element:ready', async () => {
		const el = createButton()
		const seen = collect(el, ['so:ready', 'so:element:ready'])

		document.body.appendChild(el)
		await nextFrame()

		expect(seen).toEqual(
			expect.arrayContaining([
				['so:ready', true],
				['so:element:ready', el],
			]),
		)
		expect(seen).toHaveLength(2)
	})

	it('под прежними именами не приходит ничего — ни на элементе, ни у формы над ним', async () => {
		const ctrl = new TButton()
		const form = document.body.appendChild(document.createElement('form'))
		const el = createButton(ctrl)
		const onElement = collect(el, LEGACY)
		const onForm = collect(form, LEGACY)

		form.appendChild(el)
		await nextFrame()

		ctrl.hide()
		ctrl.show()
		ctrl.disabled = true

		expect(onElement).toEqual([])
		expect(onForm).toEqual([])
	})

	/** Предок получает событие ядра под тем же именем: оно всплывает. */
	it('форма над элементом слышит so:hide', () => {
		const ctrl = new TButton()
		const form = document.body.appendChild(document.createElement('form'))
		const heard = collect(form, ['so:hide'])

		form.appendChild(createButton(ctrl))

		ctrl.hide()

		expect(namesOf(heard)).toEqual(['so:hide'])
	})
})
