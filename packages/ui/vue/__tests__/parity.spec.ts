/**
 * What the platform parity run found in the Vue adapter
 * (benchmarks/parity/README.md).
 *
 * - The root drawn by a component — Icon's glyph in `tag` — put the
 *   component's instance into the template ref, and `TElementPlugin` got it
 *   instead of the node: no `element:ready`, no node for Icon's plugins.
 * - The consumer heard the component's teardown: Vue runs the parent's
 *   unmount hooks first and the children's after, the markup items leaving
 *   the collection sent `update:items` with an ever shorter list, and
 *   `v-model:items` of a `v-if`-ed owner emptied the parent's list. The other
 *   adapters hear nothing once the unmount began.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { TElementPlugin } from '@soldy-ui/plugins'
import { Icon, ListBox, ListBoxItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

/** A glyph component, as an icon package draws one: its root is the `svg`. */
const Glyph = defineComponent({
	render: () => h('svg', { viewBox: '0 0 24 24' }),
})

describe('Icon с глифом в tag', () => {
	it('TElementPlugin получает узел svg, а не экземпляр компонента', async () => {
		const ready = vi.fn()

		wrapper = mount(Icon, {
			props: { tag: Glyph },
			attrs: {
				'onElement:create': (plugin: unknown) => {
					if (plugin instanceof TElementPlugin) plugin.events.on('ready', ready)
				},
			},
		})
		await frame()

		expect(ready).toHaveBeenCalledTimes(1)
		expect(ready.mock.calls[0][0]).toBe(wrapper.find('svg').element)
	})
})

describe('снятие компонента', () => {
	it('update:items владельца под v-if не приходит с его снятием', async () => {
		const shown = ref(true)
		const lengths: number[] = []
		const update = (next: readonly unknown[]) => lengths.push(next.length)

		wrapper = mount(() =>
			shown.value
				? h(ListBox, { 'onUpdate:items': update }, () =>
						['a', 'b'].map((value) =>
							h(ListBoxItem, { key: value, value, text: value }),
						),
					)
				: null,
		)
		await nextTick()

		expect(lengths.at(-1)).toBe(2)

		const mounted = lengths.length

		shown.value = false
		await nextTick()

		expect(lengths).toHaveLength(mounted)
	})
})
