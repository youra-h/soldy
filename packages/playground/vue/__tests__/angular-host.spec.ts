/**
 * Хост Angular — то, что у него своё.
 *
 * Общее со всеми хостами — витрину, страницы, сценарии, язык — проверяют
 * дымовые тесты по списку фреймворков. Здесь — решения самого хоста Angular:
 * компоненты стенд собирает компилятором Angular, а пакеты Angular — линкером,
 * и компилятора Angular в рантайме нет; пропсы уходят входам по имени, и
 * пропа без входа хост не глушит; экземпляр ядра адаптер берёт при сборке, и
 * смена `ctrl` ставит компонент заново; обёртку и содержимое превью хост
 * собирает сам — части на своих элементах в проекциях, после владельца и с
 * его инжектором.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TListBox, createEngine } from '@soldy-ui/core'
import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
import { loadHost } from '../src/hosts'

const host = await loadHost('angular')

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Узлы оболочки под превью — снимаются после теста. */
const nodes: HTMLElement[] = []

function stage(): HTMLElement {
	const node = document.createElement('div')

	document.body.appendChild(node)
	nodes.push(node)

	return node
}

afterEach(() => {
	for (const node of nodes.splice(0)) node.remove()
})

/** Кнопки превью в узле. */
const buttons = (node: HTMLElement) => [...node.querySelectorAll('.s-button')]

/** Текст кнопки превью. */
const label = (node: HTMLElement) => node.querySelector('.s-button__text')?.textContent?.trim()

describe('хост Angular', () => {
	/**
	 * Пакеты Angular выпущены в частичной форме, и без линкера первый же их
	 * импорт попросил бы компилятор Angular в рантайме — а тот, загрузившись,
	 * кладёт себя в `ng.ɵcompilerFacade`. Стенд собирает Angular заранее: JIT в
	 * нём нет, и шаблоны компилирует только компилятор Angular.
	 */
	it('компилятора Angular в рантайме нет', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'button', props: {} })
		const ng: unknown = Reflect.get(globalThis, 'ng')

		expect(label(node)).toBe('Кнопка')
		expect(typeof ng === 'object' && ng !== null && 'ɵcompilerFacade' in ng).toBe(false)

		handle.unmount()
	})

	it('снятое превью оставляет узел оболочки пустым', () => {
		const node = stage()

		host.mount(node, { component: 'button', props: { text: 'Снять' } }).unmount()

		expect(node.childNodes).toHaveLength(0)
	})

	/**
	 * Экземпляр ядра адаптер берёт при сборке, а не на лету: новый `ctrl` —
	 * новый компонент, и рисует он новый экземпляр, а прежний его больше не
	 * трогает.
	 */
	it('смена ctrl ставит компонент заново, с новым экземпляром', async () => {
		const node = stage()
		const first = new TButton()
		const second = new TButton()
		const handle = host.mount(node, { component: 'button', props: { ctrl: first } })
		const [before] = buttons(node)

		handle.update({ ctrl: second })

		expect(buttons(node)).toHaveLength(1)
		expect(buttons(node)[0]).not.toBe(before)

		// Нарисован новый экземпляр: его смена видна, а прежний кнопку больше не
		// трогает. Смену состояния приложение проверяет само, на своём такте
		second.text = 'Новый'
		first.text = 'Прежний'
		await nextFrame()

		expect(label(node)).toBe('Новый')

		handle.unmount()
	})

	/**
	 * Тег корня — у самого элемента (`<a so-button>`), и входа `tag` у
	 * компонентов Angular нет: строку `tag` хост не пишет, как хост Web
	 * Components. Остальной проп без входа — расхождение адаптера с
	 * дескриптором: хост называет его, а узел оболочки остаётся пустым.
	 */
	it('tag хост не пишет, а проп без входа называет', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'button', props: { tag: 'a' } })

		expect(buttons(node).map((button) => button.localName)).toEqual(['button'])

		handle.unmount()

		expect(() => host.mount(node, { component: 'button', props: { nothing: true } })).toThrow(
			'нет входов: nothing',
		)
		expect(node.childNodes).toHaveLength(0)
	})
})

/** Подписи элементов коллекций превью — из общего манифеста. */
const TEXTS = COLLECTION_ITEMS.map((item) => item.text)

/** Элементы узла по селектору — с типом HTML-элемента. */
const all = (node: ParentNode, selector: string): HTMLElement[] =>
	[...node.querySelectorAll(selector)].filter((element) => element instanceof HTMLElement)

/** Текст элементов по селектору, без пробелов по краям. */
const textsOf = (node: ParentNode, selector: string): string[] =>
	all(node, selector).map((element) => element.textContent?.trim() ?? '')

describe('хост Angular · обёртка и содержимое', () => {
	/**
	 * Элементы списка — свои компоненты на своих элементах в основной проекции
	 * владельца. Элемент читает лифт владельца при своей сборке, поэтому хост
	 * собирает его после владельца и с его инжектором: вошёл в коллекцию —
	 * встал на своё место в ней (`order`) и выбирается кликом. Снятое превью
	 * уносит и части.
	 */
	it('элементы списка входят в коллекцию владельца в порядке разметки', async () => {
		const node = stage()
		const handle = host.mount(node, { component: 'list-box', props: {} })
		const items = all(node, '.s-list-box > .s-list-box-item')

		expect(textsOf(node, '.s-list-box-item')).toEqual(TEXTS)
		expect(items.map((item) => item.style.order)).toEqual(['0', '1', '2', '3', '4'])

		all(items[1], '.s-button')[0]?.click()
		await nextFrame()

		expect(items.map((item) => item.dataset.selected)).toEqual([
			'false',
			'true',
			'false',
			'false',
			'false',
		])

		handle.unmount()

		expect(node.childNodes).toHaveLength(0)
	})

	/**
	 * Части со слотом ложатся в его проекцию: панели — в `[slot=content]`,
	 * рядом со списком табов, а не в нём. Видна панель активного таба, и в ней
	 * её содержимое.
	 */
	it('панели табов — в слоте content, вне списка табов', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'tabs', props: {} })
		const list = node.querySelector('.s-tabs > .s-tabs__list')
		const panels = all(node, '.s-tabs > .s-tabs__panel')

		expect(list && textsOf(list, '.s-tabs-item')).toEqual(TEXTS)
		expect(list?.querySelectorAll('.s-tabs__panel')).toHaveLength(0)
		expect(panels.map((panel) => panel.style.display !== 'none')).toEqual([
			true,
			false,
			false,
			false,
			false,
		])
		expect(panels[0].textContent?.trim()).toBe('Панель «Первый»')

		handle.unmount()
	})

	/**
	 * Радио — одна группа: общее имя полям даёт коллекция группы, а не разметка.
	 * Подпись радио — текст в его проекции.
	 */
	it('радио — одной группой, с подписью содержимым', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'radio-group', props: {} })
		const names = all(node, '.s-radio-group-item input').map((input) =>
			input.getAttribute('name'),
		)

		expect(textsOf(node, '.s-radio-group > .s-radio-group-item')).toEqual(TEXTS)
		expect(names).toHaveLength(TEXTS.length)
		expect(new Set(names).size).toBe(1)
		expect(names[0]).toBeTruthy()

		handle.unmount()
	})

	/**
	 * Обёртка — подпись вокруг флажка: флажок стоит в её проекции, а пропсы
	 * строки и выходы — его, а не её. Входа `text` у флажка нет, и строка с ним
	 * — ошибка, хотя у подписи такой вход есть.
	 */
	it('обёртка: компонент в её проекции, пропсы строки и выходы — его', () => {
		const node = stage()
		const events: string[] = []
		const handle = host.mount(node, {
			component: 'check-box',
			props: {},
			onEvent: (name) => events.push(name),
		})
		const input = node.querySelector('.s-label > .s-label__control > .s-check-box > input')

		expect(textsOf(node, '.s-label__text')).toEqual(['Согласен'])
		expect(input instanceof HTMLInputElement && input.checked).toBe(false)

		handle.update({ value: true })

		expect(input instanceof HTMLInputElement && input.checked).toBe(true)
		expect(events).toContain('change:value')
		expect(() => handle.update({ text: 'Подпись' })).toThrow('нет входов: text')

		handle.unmount()
	})

	/**
	 * Без обёртки содержимое — у самого компонента: флажок в основной проекции
	 * подписи, а строка правит саму подпись — её проп поверх пропа превью.
	 */
	it('содержимое подписи — флажок в её проекции, пропсы строки — подписи', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'label', props: { text: 'Подпись' } })

		expect(node.querySelector('.s-label > .s-label__control > .s-check-box > input')).not.toBe(
			null,
		)
		expect(textsOf(node, '.s-label__text')).toEqual(['Подпись'])

		handle.unmount()
	})

	/**
	 * Новый `ctrl` — новое превью целиком: владелец с новым экземпляром и его
	 * части, вошедшие уже в его коллекцию. Движок у каждого владельца свой, как
	 * у строки страницы.
	 */
	it('смена ctrl ставит владельца заново, с частями', () => {
		const node = stage()
		const handle = host.mount(node, {
			component: 'list-box',
			props: { ctrl: new TListBox(), engine: createEngine() },
		})
		const [before] = all(node, '.s-list-box')

		handle.update({ ctrl: new TListBox(), engine: createEngine() })

		const lists = all(node, '.s-list-box')

		expect(lists).toHaveLength(1)
		expect(lists[0]).not.toBe(before)
		expect(all(lists[0], '.s-list-box-item').map((item) => item.style.order)).toEqual([
			'0',
			'1',
			'2',
			'3',
			'4',
		])

		handle.unmount()

		expect(node.childNodes).toHaveLength(0)
	})
})
