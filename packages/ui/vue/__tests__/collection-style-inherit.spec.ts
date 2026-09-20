/**
 * Размер элемента списка — размер списка, как список ни наполняй.
 *
 * Ядро это стережёт на шести коллекциях (`core/__tests__/
 * collection-style-inherit.spec.ts`); здесь проверяется, что правило доезжает
 * до разметки: свой `size` у `ListBox.Item` ничего не меняет, а смена размера
 * у списка переставляет модификатор строки — не оставляя рядом старый.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ListBox, ListBoxItem } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Список размером из пропа `size`, у элемента своё `sm`. */
const Harness = {
	components: { ListBox, ListBoxItem },
	props: { size: { type: String, default: 'lg' } },
	template: `
		<ListBox :size="size">
			<ListBoxItem value="a" text="A" size="sm" />
		</ListBox>
	`,
}

/** Модификаторы размера на корне строки: их должно быть ровно по одному. */
const sizeModifiers = () =>
	[...(document.querySelector('.s-list-box-item')?.classList ?? [])].filter((cls) =>
		cls.startsWith('s-list-box-item--size-'),
	)

describe('ListBox.Item: размер приходит от списка', () => {
	it('свой size элемента не действует, смена у списка переставляет модификатор', async () => {
		const mounted = mount(Harness, { attachTo: document.body })

		wrapper = mounted
		await nextTick()

		expect(sizeModifiers()).toEqual(['s-list-box-item--size-lg'])

		await mounted.setProps({ size: 'xl' })
		await nextTick()

		expect(sizeModifiers()).toEqual(['s-list-box-item--size-xl'])
	})
})
