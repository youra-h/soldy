/**
 * Inputs of a component reach the core without a `watch` over the props
 * (`useAdapterParts`, step 2): a watch read every input to have Vue track it,
 * and the props proxy created a `Dep` and a `Link` per read key on top of the
 * effect itself — on every component on the page.
 *
 * `queryObjects` from `node:v8` collects garbage itself and counts reachable
 * instances of a class (see `virtual-rows.spec.ts`). The difference between
 * twice as many buttons and half as many keeps out what is created once for
 * the first instance. The app is built and unmounted inside a nested function,
 * so nothing holds the previous tree afterwards.
 */

import { describe, it, expect } from 'vitest'
import { ReactiveEffect, createApp, defineComponent, h, nextTick, ref } from 'vue'
import { queryObjects } from 'node:v8'
import { TButton } from '@soldy-ui/core'
import { Button } from '@soldy-ui/vue'

const effects = () => queryObjects(ReactiveEffect, { format: 'count' })

async function effectsWith(count: number): Promise<number> {
	const host = document.createElement('div')
	const app = createApp({
		render: () => Array.from({ length: count }, (_, index) => h(Button, { text: `B${index}` })),
	})

	document.body.appendChild(host)
	app.mount(host)
	await nextTick()

	const alive = effects()

	app.unmount()
	host.remove()

	return alive
}

describe('входы компонента Vue', () => {
	it('кнопка заводит два эффекта — отрисовку и связку корня, а не watch на пропсы', async () => {
		const few = await effectsWith(20)
		const many = await effectsWith(40)

		expect((many - few) / 20).toBe(2)
	})

	it('смена пропа родителем доходит до ядра, своя перерисовка входов не трогает', async () => {
		const ctrl = new TButton({ text: 'Сохранить' })
		const text = ref('Сохранить')
		const host = document.createElement('div')
		const app = createApp(
			defineComponent({
				setup: () => () => h(Button, { ctrl, text: text.value }),
			}),
		)

		document.body.appendChild(host)
		app.mount(host)
		await nextTick()

		// The core changed through the instance: its own re-render keeps the
		// vnode, and the unchanged input does not roll the text back
		ctrl.text = 'Из кода'
		ctrl.disabled = true
		await nextTick()

		expect(ctrl.text).toBe('Из кода')
		expect(host.querySelector('button')?.textContent).toContain('Из кода')

		text.value = 'Отправить'
		await nextTick()

		expect(ctrl.text).toBe('Отправить')
		expect(host.querySelector('button')?.textContent).toContain('Отправить')

		app.unmount()
		host.remove()
	})
})
