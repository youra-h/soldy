/**
 * Хост Web Components — то, что у него своё.
 *
 * Общее со всеми хостами — витрину, страницы, сценарии, язык — проверяют
 * дымовые тесты по списку фреймворков. Здесь — описание элемента, которым
 * хост рисует превью и фикстуры: свои атрибуты элемента (роль иконки) стоят на
 * нём, как в разметке, дети по слотам — его светом, и первая сборка
 * раскладывает их по слотам, а обёртка превью (подпись вокруг флажка) — свой
 * элемент, в слоте по умолчанию которого лежит компонент.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TCheckBox } from '@soldy-ui/core'
import { getIcon } from '@soldy-ui/setup'
import { loadHost } from '../src/hosts'

/** Рендер элемента коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const host = await loadHost('webc')

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

/** Роль иконки и `viewBox` её рисунка — так видно, что нарисовано. */
function drawn(icon: Element): [string | null, string | null | undefined] {
	return [icon.getAttribute('icon'), icon.querySelector(':scope > svg')?.getAttribute('viewBox')]
}

describe('хост Web Components', () => {
	it('превью Icon — роль своим атрибутом элемента, рисунок роли внутри', () => {
		const node = stage()
		const handle = host.mount(node, { component: 'icon', props: { size: 'lg' } })
		const icon = node.querySelector('span.so-icon')

		if (!icon) throw new Error('иконки нет')

		expect(drawn(icon)).toEqual(['arrowDown', getIcon('arrowDown').viewBox])
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)

		handle.unmount()
	})

	/**
	 * Пропсы строки — элементу фикстуры, а не его детям: в разметке остальных
	 * хостов они тоже стоят только на компоненте сценария.
	 */
	it('фикстура — элемент с детьми по слотам: иконки по краям подписи', () => {
		const node = stage()
		const handle = host.mount(node, {
			component: 'button',
			fixture: 'button-slot-icons',
			props: { text: 'Подпись', size: 'lg' },
		})
		const button = node.querySelector('button.so-button')

		if (!button) throw new Error('кнопки нет')

		const [leading, text, trailing] = [...button.children]

		expect(button.children).toHaveLength(3)
		expect(drawn(leading)).toEqual(['check', getIcon('check').viewBox])
		expect(text.textContent).toBe('Подпись')
		expect(drawn(trailing)).toEqual(['arrowRight', getIcon('arrowRight').viewBox])
		expect(button.classList.contains('so-button--size-lg')).toBe(true)
		expect(
			[leading, trailing].map((icon) => icon.classList.contains('so-icon--size-normal')),
		).toEqual([true, true])

		handle.unmount()
	})

	/**
	 * Превью флажка — в подписи, как у Vue и React. Подпись — обёртка со своими
	 * пропсами описания, а пропсы строки и слушатели — у флажка: страница
	 * правит контрол, и в журнал попадают его события.
	 */
	it('флажок в подписи: пропсы строки и слушатели — у флажка', async () => {
		const node = stage()
		const events: string[] = []
		const handle = host.mount(node, {
			component: 'check-box',
			props: { size: 'lg' },
			onEvent: (name) => events.push(name),
		})
		const label = find(node, 'label.so-label')
		const box = find(label, '.so-label__control > .so-check-box')

		expect(find(label, '.so-label__text').textContent).toBe('Согласен')
		expect(box.classList.contains('so-check-box--size-lg')).toBe(true)
		expect(label.classList.contains('so-label--size-normal')).toBe(true)

		await nextFrame()
		events.length = 0
		find(label, '.so-label__text').click()

		expect(box.querySelector('input')?.checked).toBe(true)
		expect(events).toContain('change:value')

		handle.update({ size: 'sm' })
		await flush()

		expect(box.classList.contains('so-check-box--size-sm')).toBe(true)
		expect(label.classList.contains('so-label--size-normal')).toBe(true)

		handle.unmount()
	})

	/** Смена `ctrl` строит заново и флажок, и подпись вокруг него. */
	it('смена ctrl пересоздаёт и обёртку, и компонент', () => {
		const node = stage()
		const first = new TCheckBox()
		const second = new TCheckBox({ value: true })
		const handle = host.mount(node, { component: 'check-box', props: { ctrl: first } })
		const label = find(node, 'label.so-label')

		handle.update({ ctrl: second })

		const next = find(node, 'label.so-label')

		expect(next).not.toBe(label)
		expect(node.querySelectorAll('label.so-label')).toHaveLength(1)
		expect(next.querySelector('input')?.checked).toBe(true)

		handle.unmount()
	})

	it('фикстура label-check-box — подпись с флажком в слоте по умолчанию, текст — из пропа', () => {
		const node = stage()
		const handle = host.mount(node, {
			component: 'label',
			fixture: 'label-check-box',
			props: { text: 'Подпись' },
		})
		const label = find(node, 'label.so-label')
		const input = label.querySelector('.so-label__control input')

		expect(find(label, '.so-label__text').textContent).toBe('Подпись')
		expect(input instanceof HTMLInputElement ? [...(input.labels ?? [])] : []).toEqual([label])

		handle.unmount()
	})

	/**
	 * У корня с полем `id` — проп поля, а не вход корня: `el.id` — собственный
	 * `id` корня. Строка `id` после монтирования доходит до поля инстансом.
	 */
	it('id поля из строки — на <input>, а не на корне', async () => {
		const node = stage()
		const handle = host.mount(node, { component: 'input', props: { id: 'first' } })
		const root = find(node, '.so-input')

		expect(root.querySelector('input')?.id).toBe('first')
		expect(root.hasAttribute('id')).toBe(false)

		handle.update({ id: 'second' })
		await flush()

		expect(root.querySelector('input')?.id).toBe('second')
		expect(root.hasAttribute('id')).toBe(false)

		handle.update({})
		await flush()

		expect(root.querySelector('input')?.hasAttribute('id')).toBe(false)

		handle.unmount()
	})
})

/** Узел по селектору; нет его — тест падает здесь. */
function find(root: ParentNode, selector: string): HTMLElement {
	const node = root.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: узла нет`)

	return node
}
