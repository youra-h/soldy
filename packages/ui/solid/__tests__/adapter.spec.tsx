/**
 * Сборка компонента Solid и корень по `tag` — то, что общее у всех
 * компонентов адаптера.
 *
 * - Id монтирования — от `createUniqueId()`: набор строит от него `id`
 *   частей (`createId`), а не от своего счётчика процесса, который на сервере
 *   общий для всех запросов и при гидратации разошёлся бы.
 * - Компонент Solid в `tag` получает атрибуты корня и `ref` адаптера и кладёт
 *   их на свой корень, содержимое рисует внутри.
 * - Состояние двух контекстов коллекции — один вид (`joinState`), и он идёт за
 *   обоими сторами, в том числе за свойством, которого к сборке не было.
 */

import { describe, it, expect, vi, onTestFinished } from 'vitest'
import { createRenderEffect, createRoot, type JSX } from 'solid-js'
import { createStore } from 'solid-js/store'
import { TPluginBundle } from '@soldy-ui/plugins'
import { Button, isTagComponent, joinState, roleIcon, rootTag } from '@soldy-ui/solid'
import { find, mount, nextFrame } from './mount'

/** Набор кнопки — из `onBundleCreate`, на микрозадаче после сборки. */
async function bundleOf(): Promise<TPluginBundle> {
	const bundles: TPluginBundle[] = []

	mount(() => (
		<Button
			onBundleCreate={(bundle: unknown) => {
				if (bundle instanceof TPluginBundle) bundles.push(bundle)
			}}
		/>
	))
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
})

/** Ссылка приложения: атрибуты корня и `ref` — на свой `<a>`, содержимое — внутри. */
function Link(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>): JSX.Element {
	return <a href="/target" {...props} />
}

describe('компонент в tag', () => {
	it('получает атрибуты корня, ref и содержимое', async () => {
		const onElementReady = vi.fn()
		const { container } = mount(() => (
			<Button tag={Link} text="Перейти" class="app-link" onElementReady={onElementReady} />
		))

		await nextFrame()

		const link = find(container, ':scope > a', HTMLAnchorElement)

		expect([...link.classList]).toEqual(expect.arrayContaining(['so-button', 'app-link']))
		expect(link.getAttribute('href')).toBe('/target')
		expect(link.getAttribute('data-disabled')).toBe('false')
		expect(link.querySelector('.so-button__text')?.textContent).toBe('Перейти')
		expect(onElementReady).toHaveBeenCalledTimes(1)
		expect(onElementReady).toHaveBeenCalledWith(link)
	})

	/** Другого объекта Solid нарисовать не может — корня нет, как у `<component :is>` без компонента. */
	it('объект, который не компонент Solid, — корня нет', () => {
		const { container } = mount(() => <Button tag={{}} text="Нет" />)

		expect(container.children).toHaveLength(0)
	})

	it('корень по tag: строка — элемент, функция — компонент, прочий объект — ничего', () => {
		expect(rootTag('a')).toBe('a')
		expect(rootTag(Link)).toBe(Link)
		expect(rootTag(roleIcon('check'))).toBe(roleIcon('check'))
		expect(rootTag({})).toBeUndefined()
		expect(isTagComponent(Link)).toBe(true)
		expect(isTagComponent('a')).toBe(false)
		expect(isTagComponent({})).toBe(false)
	})
})

/**
 * Вид двух сторов — свой и фасада. Ключа со значением `undefined` в сторе
 * Solid нет вовсе, и вид геттерами по ключам, собранный при сборке, не увидел
 * бы свойства, которое появилось позже (`closable` таба, имя из `aria_label`).
 */
describe('joinState', () => {
	type TState = { own?: string; facade?: string; shared?: string }

	/** Значения, которые увидел эффект, читающий `key` вида; эффект снимается с тестом. */
	function watch(key: keyof TState, view: TState): Array<string | undefined> {
		const seen: Array<string | undefined> = []

		createRoot((dispose) => {
			createRenderEffect(() => {
				seen.push(view[key])
			})

			onTestFinished(dispose)
		})

		return seen
	}

	it('свойство, которого к сборке не было, вид видит, когда оно появилось', () => {
		const [own] = createStore<TState>({ own: 'a' })
		const [facade, setFacade] = createStore<TState>({})
		const seen = watch('facade', joinState(own, facade))

		setFacade({ facade: 'b' })

		expect(seen).toEqual([undefined, 'b'])
	})

	it('верхнее перекрывает нижнее, снятое верхнее — снова нижнее', () => {
		const [below] = createStore<TState>({ shared: 'снизу' })
		const [above, setAbove] = createStore<TState>({})
		const seen = watch('shared', joinState(below, above))

		setAbove({ shared: 'сверху' })
		setAbove({ shared: undefined })

		expect(seen).toEqual(['снизу', 'сверху', 'снизу'])
	})
})
