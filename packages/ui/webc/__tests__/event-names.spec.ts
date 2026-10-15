/**
 * Имена событий элемента.
 *
 * Событие ядра уходит `CustomEvent` с элемента потребителя и всплывает, поэтому
 * его имя делит пространство имён с событиями браузера. Составное имя
 * (`change:visible`, `element:ready`) уходит как в ядре: в именах событий DOM
 * двоеточия нет. Событие из одного слова — с префиксом `so-` (`so-hide`): под
 * своим именем (`input`, `reset`) его слушатель на элементе получал бы вместе с
 * событием браузера, а предки — форма, документ — принимали бы за событие
 * браузера.
 *
 * Перебираются дескрипторы экспорта `@soldy-ui/setup`, а не элементы адаптера:
 * под проверку сразу попадают и непортированные — поля с `input`, Select с
 * `open` и `close`, коллекции с `reset`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
import * as setup from '@soldy-ui/setup'
import {
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

function isSoldyButton(node: Element): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** Кнопка soldy, ещё не подключённая; `ctrl` — до подключения. */
function createButton(ctrl?: TButton): TButtonElementProps {
	const node = document.createElement('button', { is: 'so-button' })

	if (!isSoldyButton(node)) throw new Error('<button is="so-button"> нет')

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

afterEach(() => {
	document.body.innerHTML = ''
})

describe('имя события · не событие DOM', () => {
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
			expect.arrayContaining(['so-input', 'input:value', 'change:value']),
		)
		expect(eventNames(SelectDescriptor())).toEqual(
			expect.arrayContaining(['so-open', 'so-close']),
		)
		expect(eventNames(ListBoxCollectionDescriptor())).toContain('so-reset')
	})

	it('составное имя — как в ядре, из одного слова — с префиксом so-', () => {
		const wrong = descriptors.flatMap(([name, descriptor]) =>
			TSurface.of(descriptor, WebcProfile).events.flatMap(({ name: event, exportName }) => {
				const core = event.getName()
				const expected = core.includes(':') ? core : `so-${core}`

				return exportName === expected ? [] : [`${name}: ${core} → ${exportName}`]
			}),
		)

		expect(wrong).toEqual([])
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

describe('событие из одного слова · слушатель нового имени', () => {
	it('show и hide ядра приходят под so-show и so-hide, под своим именем — нет', () => {
		const ctrl = new TButton()
		const el = createButton(ctrl)

		document.body.appendChild(el)

		const prefixed = collect(el, ['so-show', 'so-hide'])
		const bare = collect(el, ['show', 'hide'])

		ctrl.hide()
		ctrl.show()

		expect(prefixed.map(([name]) => name)).toEqual(['so-hide', 'so-show'])
		expect(bare).toEqual([])
	})

	it('ready ядра приходит под so-ready со значением, под своим именем — нет', async () => {
		const el = createButton()
		const prefixed = collect(el, ['so-ready'])
		const bare = collect(el, ['ready'])

		document.body.appendChild(el)
		await nextFrame()

		expect(prefixed).toEqual([['so-ready', true]])
		expect(bare).toEqual([])
	})

	/** Предок получает событие ядра под новым именем, а его слушатель события браузера — нет. */
	it('форма над элементом слышит so-hide, а не hide', () => {
		const ctrl = new TButton()
		const form = document.body.appendChild(document.createElement('form'))
		const heard = collect(form, ['so-hide', 'hide'])

		form.appendChild(createButton(ctrl))

		ctrl.hide()

		expect(heard.map(([name]) => name)).toEqual(['so-hide'])
	})

	it('составное имя не меняется: change:visible и element:ready', async () => {
		const ctrl = new TButton()
		const el = createButton(ctrl)
		const seen = collect(el, ['change:visible', 'element:ready'])

		document.body.appendChild(el)
		await nextFrame()

		ctrl.hide()

		expect(seen).toEqual([
			['element:ready', el],
			['change:visible', false],
		])
	})
})
