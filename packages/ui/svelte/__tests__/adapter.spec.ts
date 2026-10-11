/**
 * Сборка компонента Svelte и корень по `tag` — то, что общее у всех
 * компонентов адаптера.
 *
 * - Id монтирования — от `$props.id()` компонента: набор строит от него `id`
 *   частей (`createId`), а не от своего счётчика процесса, который на сервере
 *   общий для всех запросов и при гидратации разошёлся бы.
 * - Компонент Svelte в `tag` получает атрибуты корня и привязку к
 *   `TElementPlugin` и кладёт их на свой корень, содержимое рисует внутри.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { TPluginBundle } from '@soldy-ui/plugins'
import {
	Button,
	isTagComponent,
	roleIcon,
	type TSvelteAdapterContextOptions,
} from '@soldy-ui/svelte'
import Link from './Link.test.svelte'
import { find, mount, nextFrame, readyProbe } from './mount'

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

		// Свой счётчик набора даёт `s-<n>`: им набор берёт, когда адаптер id
		// монтирования не передал
		expect(first).not.toMatch(/^s-\d+-part$/)
		expect(second).not.toMatch(/^s-\d+-part$/)
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

		expect([...link.classList]).toEqual(expect.arrayContaining(['s-button', 'app-link']))
		expect(link.getAttribute('href')).toBe('/target')
		expect(link.getAttribute('data-disabled')).toBe('false')
		expect(link.querySelector('.s-button__text')?.textContent).toBe('Перейти')
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
