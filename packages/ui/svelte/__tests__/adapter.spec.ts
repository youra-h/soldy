/**
 * Сборка компонента Svelte и корень по `tag` — то, что общее у всех
 * компонентов адаптера.
 *
 * - Id монтирования — от `$props.id()` компонента: набор строит от него `id`
 *   частей (`createId`), а не от своего счётчика процесса, который на сервере
 *   общий для всех запросов и при гидратации разошёлся бы.
 * - Компонент Svelte в `tag` получает атрибуты корня и привязку к
 *   `TElementPlugin` и кладёт их на свой корень, содержимое рисует внутри.
 * - Ядро меняется и посреди отрисовки Svelte — от события DOM, которое
 *   браузер шлёт внутри его эффекта, — и связка пишет состояние без ошибки.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { flushSync } from 'svelte'
import { TButton } from '@soldy-ui/core'
import { TPluginBundle } from '@soldy-ui/plugins'
import {
	Button,
	isTagComponent,
	roleIcon,
	type TSvelteAdapterContextOptions,
} from '@soldy-ui/svelte'
import Link from './Link.test.svelte'
import RenderEvent from './RenderEvent.test.svelte'
import { find, mount, nextFrame, readyProbe } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** Набор кнопки — из `onBundleCreate`, на микрозадаче после сборки. */
async function bundleOf(props: { text?: string } = {}): Promise<TPluginBundle> {
	const bundles: TPluginBundle[] = []

	mount(Button, {
		...props,
		onBundleCreate: (bundle: unknown) => {
			if (bundle instanceof TPluginBundle) bundles.push(bundle)
		},
	})
	await Promise.resolve()

	const [bundle] = bundles

	if (!bundle) throw new Error('набор не объявлен')

	return bundle
}

describe('id монтирования', () => {
	it('createId набора — не со своего счётчика и у двух монтирований разный', async () => {
		const first = (await bundleOf()).createId('part')
		const second = (await bundleOf()).createId('part')

		// Свой счётчик набора даёт `so-<n>`: им набор берёт, когда адаптер id
		// монтирования не передал
		expect(first).not.toMatch(/^so-\d+-part$/)
		expect(second).not.toMatch(/^so-\d+-part$/)
		expect(first).toMatch(/-part$/)
		expect(first).not.toBe(second)
	})

	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('обёртка сборки требует id монтирования', () => {
		expectTypeOf<TSvelteAdapterContextOptions<object>['mountId']>().toEqualTypeOf<string>()
	})
})

describe('компонент в tag', () => {
	it('получает атрибуты корня, привязку и содержимое', async () => {
		const ready = readyProbe()
		const { container } = mount(Button, {
			tag: Link,
			text: 'Перейти',
			class: 'app-link',
			onElementReady: ready.onElementReady,
		})

		await nextFrame()

		const link = find(container, ':scope > a', HTMLAnchorElement)

		expect([...link.classList]).toEqual(expect.arrayContaining(['so-button', 'app-link']))
		expect(link.getAttribute('href')).toBe('/target')
		expect(link.getAttribute('data-disabled')).toBe('false')
		expect(link.querySelector('.so-button__text')?.textContent).toBe('Перейти')
		expect(ready.elements).toHaveLength(1)
		expect(ready.elements[0]).toBe(link)
	})

	it('компонент — функция; строка, метка роли и прочий объект — нет', () => {
		expect(isTagComponent(Link)).toBe(true)
		expect(isTagComponent('a')).toBe(false)
		expect(isTagComponent(roleIcon('check'))).toBe(false)
		expect(isTagComponent({})).toBe(false)
	})
})

describe('ядро меняется посреди отрисовки Svelte', () => {
	/**
	 * Плагины слушают DOM своими обработчиками, мимо Svelte, и событие, которое
	 * браузер шлёт посреди отрисовки, меняет ядро внутри эффекта блока: так
	 * `focusout` узла в фокусе, который петля с ключом переставила, снимает
	 * `focused` (перестановка элемента ListBox жестом). Свои обработчики
	 * событий Svelte зовёт вне реактивного контекста, а запись связки в руну
	 * состояния — та же внешняя запись, и Svelte не считает её мутацией из
	 * шаблона (`state_unsafe_mutation`).
	 */
	it('focusout посреди отрисовки снимает focused — без ошибки', async () => {
		const errors: string[] = []
		const collect = (event: ErrorEvent): void => {
			errors.push(event.message)
			event.preventDefault()
		}
		const ctrl = new TButton({ text: 'Сохранить' })
		const props = reactiveProps({ ctrl, blur: false })
		const changes: boolean[] = []

		ctrl.events.on('change:focused', (focused) => changes.push(focused))
		mount(RenderEvent, props)

		// Слушатели фокуса плагин ставит по `ready` узла — через кадр
		await nextFrame()

		const button = find(document, '.so-button', HTMLElement)

		button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
		window.addEventListener('error', collect)

		try {
			props.blur = true
			flushSync()
		} finally {
			window.removeEventListener('error', collect)
		}

		expect(errors).toEqual([])
		expect(changes).toEqual([true, false])
		expect(document.querySelector('.blurred')).not.toBeNull()
	})
})
