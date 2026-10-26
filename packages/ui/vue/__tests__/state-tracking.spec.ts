/**
 * The state of a component reaches its template through the binding view
 * (`src/adapter/runtime/view.ts`): one `shallowReactive` record per context
 * behind one proxy. Vue creates a `Dep` for a key only when the render reads
 * it; a `shallowRef` per property cost a `RefImpl` and a `Dep` on every
 * property, read by the markup or not.
 *
 * `queryObjects` from `node:v8` collects garbage itself and counts reachable
 * instances of a class (see `input-tracking.spec.ts`). `RefImpl` and `Dep`
 * Vue does not export: their classes are taken from a ref. The difference
 * between twice as many components and half as many keeps out what is created
 * once for the first instance.
 */

import { describe, it, expect } from 'vitest'
import { ReactiveEffect, createApp, h, nextTick, ref, type Component } from 'vue'
import { queryObjects } from 'node:v8'
import { TButton } from '@soldy-ui/core'
import { ButtonDescriptor } from '@soldy-ui/setup'
import { BaseButton, Button, ListBox, ListBoxItem } from '@soldy-ui/vue'
import {
	createVueAdapterContext,
	extendBinding,
	joinBindings,
	useAdapter,
	type SetupContext,
} from '../src/adapter'
import type { ButtonProps } from '../src/components/button/base.component'

const RefImpl = ref(0).constructor
const Dep: unknown = Reflect.get(Reflect.get(ref(0), 'dep') ?? {}, 'constructor')

function countOf(ctor: unknown): number {
	if (typeof ctor !== 'function') throw new Error('not a class')

	return queryObjects(ctor, { format: 'count' })
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** Live instances of the class with `count` copies mounted. */
async function aliveWith(
	ctor: unknown,
	count: number,
	copy: (index: number) => ReturnType<typeof h>,
): Promise<number> {
	const host = document.createElement('div')
	const app = createApp({
		render: () => Array.from({ length: count }, (_, index) => copy(index)),
	})

	document.body.appendChild(host)
	app.mount(host)
	await nextTick()
	await frame()

	const alive = countOf(ctor)

	app.unmount()
	host.remove()

	return alive
}

/** What one copy adds: the difference between 20 copies and 10, per copy. */
async function perCopy(
	ctor: unknown,
	copy: (index: number) => ReturnType<typeof h>,
): Promise<number> {
	const few = await aliveWith(ctor, 10, copy)
	const many = await aliveWith(ctor, 20, copy)

	return (many - few) / 10
}

/** A component on `useAdapter` whose render reads the given properties of a button's state. */
function probe(keys: readonly string[]): Component {
	return {
		extends: BaseButton,
		setup(props: ButtonProps, { emit }: SetupContext) {
			const adapter = createVueAdapterContext(ButtonDescriptor(), { ctrl: props.ctrl, props })

			return useAdapter(adapter, props, emit)
		},
		// The template's path: the instance proxy, the `setup()` result, the view
		render: (ctx: object) =>
			h(
				'span',
				keys.map((key) => String(Reflect.get(ctx, key))),
			),
	}
}

describe('состояние компонента Vue', () => {
	it('кнопка держит один RefImpl — корень, а не реф на каждое свойство', async () => {
		expect(await perCopy(RefImpl, (index) => h(Button, { text: `B${index}` }))).toBe(1)
	}, 20_000)

	it('Dep заводит чтение отрисовки: три прочитанных свойства — на два Dep больше, чем одно', async () => {
		const one = await perCopy(Dep, () => h(probe(['text'])))
		const three = await perCopy(Dep, () => h(probe(['text', 'disabled', 'tag'])))

		expect(three - one).toBe(2)
	}, 20_000)

	it('элемент ListBox — четыре эффекта: отрисовка и корень у пункта и у его строки, у фасада корня нет', async () => {
		const withItem = await perCopy(ReactiveEffect, (index) =>
			h(ListBox, null, () => h(ListBoxItem, { value: `v${index}`, text: `T${index}` })),
		)
		const owner = await perCopy(ReactiveEffect, () => h(ListBox))

		expect(withItem - owner).toBe(4)
	}, 20_000)

	it('свойство, которое отрисовка не читала, ветка v-if читает уже сменившимся, и смены идут дальше', async () => {
		const ctrl = new TButton({ text: 'Сохранить' })
		const host = document.createElement('div')

		ctrl.rendered = false

		const app = createApp({ render: () => h(Button, { ctrl }) })

		document.body.appendChild(host)
		app.mount(host)
		await nextTick()

		expect(host.querySelector('button')).toBeNull()

		// Unread: the record takes the change without a dependency
		ctrl.text = 'Отправить'
		await nextTick()

		ctrl.rendered = true
		await nextTick()

		expect(host.querySelector('button')?.textContent).toContain('Отправить')

		ctrl.text = 'Готово'
		await nextTick()

		expect(host.querySelector('button')?.textContent).toContain('Готово')

		app.unmount()
		host.remove()
	})

	it('свойство без значения в первой отрисовке — из состояния, а не одноимённый проп', async () => {
		const ctrl = new TButton()
		const host = document.createElement('div')
		const app = createApp({ render: () => h(probe(['variant']), { ctrl }) })

		document.body.appendChild(host)
		app.mount(host)
		await nextTick()

		expect(host.textContent).toBe('undefined')

		ctrl.variant = 'brand'
		await nextTick()

		expect(host.textContent).toBe('brand')

		app.unmount()
		host.remove()
	})
})

describe('вид связки', () => {
	/** A binding built inside `setup()` of a button, handed out for the checks. */
	function bindingOfButton(
		build: (binding: ReturnType<typeof useAdapter>) => object = (binding) => binding,
	): { binding: object; ctrl: TButton; unmount: () => void } {
		const ctrl = new TButton({ text: 'Сохранить' })
		let binding: object = {}
		const host = document.createElement('div')
		const app = createApp({
			render: () =>
				h({
					extends: BaseButton,
					setup(props: ButtonProps, { emit }: SetupContext) {
						binding = build(
							useAdapter(
								createVueAdapterContext(ButtonDescriptor(), { ctrl, props }),
								props,
								emit,
							),
						)

						return () => null
					},
				}),
		})

		app.mount(host)

		return { binding, ctrl, unmount: () => app.unmount() }
	}

	it('ключ состояния без значения — есть: has, hasOwn и ключи его видят', () => {
		const { binding, unmount } = bindingOfButton()

		expect(Reflect.get(binding, 'variant')).toBeUndefined()
		expect('variant' in binding).toBe(true)
		expect(Object.hasOwn(binding, 'variant')).toBe(true)
		expect(Object.keys(binding)).toEqual(expect.arrayContaining(['ctrl', 'plugins', 'variant']))
		expect(Object.hasOwn(binding, 'nothing')).toBe(false)

		unmount()
	})

	it('вид читает ядро на каждое чтение, а не снимок', () => {
		const { binding, ctrl, unmount } = bindingOfButton()

		ctrl.text = 'Отправить'

		expect(Reflect.get(binding, 'text')).toBe('Отправить')

		unmount()
	})

	it('свои значения extendBinding перекрывают одноимённое состояние', () => {
		const { binding, ctrl, unmount } = bindingOfButton((own) =>
			extendBinding(own, { text: 'своё', iconTag: 'span' }),
		)

		ctrl.text = 'Отправить'

		expect(Reflect.get(binding, 'text')).toBe('своё')
		expect(Reflect.get(binding, 'iconTag')).toBe('span')
		expect(Reflect.get(binding, 'disabled')).toBe(false)

		unmount()
	})

	it('вид только для чтения: записать в него нельзя', () => {
		const { binding, unmount } = bindingOfButton()

		expect(Reflect.set(binding, 'text', 'чужое')).toBe(false)
		expect(Reflect.deleteProperty(binding, 'text')).toBe(false)
		expect(Reflect.get(binding, 'text')).toBe('Сохранить')

		unmount()
	})

	it('сводит только связки: объект не из useAdapter — ошибка', () => {
		const { binding, unmount } = bindingOfButton()

		expect(() => joinBindings(binding, {})).toThrow(/Not a binding/)
		expect(() => extendBinding({}, {})).toThrow(/Not a binding/)

		unmount()
	})
})
