/**
 * Хост Angular — то, что у него своё.
 *
 * Общее со всеми хостами — витрину, страницы, сценарии, язык — проверяют
 * дымовые тесты по списку фреймворков. Здесь — решения самого хоста Angular:
 * компоненты стенд собирает компилятором Angular, а пакеты Angular — линкером,
 * и компилятора Angular в рантайме нет; пропсы уходят входам по имени, и
 * пропа без входа хост не глушит; экземпляр ядра адаптер берёт при сборке, и
 * смена `ctrl` ставит компонент заново.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton } from '@soldy-ui/core'
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
const buttons = (node: HTMLElement) => [...node.querySelectorAll('.so-button')]

/** Текст кнопки превью. */
const label = (node: HTMLElement) => node.querySelector('.so-button__text')?.textContent?.trim()

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
