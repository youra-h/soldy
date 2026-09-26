/**
 * Умолчание, объявленное ключом без значения, во Vue остаётся `undefined`.
 *
 * Отсутствующий Boolean-проп без `default` Vue превращает в `false`. Ключ
 * `default` со значением `undefined` это отключает, поэтому умолчание
 * объявляется ключом, а не значением (см. `IPropDeclaration.default`).
 * Проверка `default !== undefined` при сборке декларации или в поверхности
 * (`TSurface.of`) сломала бы оба случая ниже молча.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { TPluginBundle } from '@soldy-ui/plugins'
import type { ISelect } from '@soldy-ui/core'
import { Select, Tabs, TabsItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

describe('ключ default без значения', () => {
	/**
	 * `closable: undefined` у элемента — «наследовать от владельца». Получи
	 * элемент `false`, кнопка закрытия пропала бы у всех табов, в разметке
	 * которых `closable` не написан.
	 */
	it('Tabs.Item без closable в <Tabs closable> получает кнопку закрытия', async () => {
		wrapper = mount(
			{
				render: () =>
					h(
						Tabs,
						{ closable: true },
						{ default: () => [h(TabsItem, { value: 'a', text: 'A' })] },
					),
			},
			{ attachTo: document.body },
		)
		await nextTick()

		expect(wrapper.find('.s-tabs-item__close').exists()).toBe(true)
	})

	/** В типе `value` есть Boolean — без ключа Vue отдал бы пустому полю `false`. */
	it('Select без value не получает false', async () => {
		const select = mount(Select, { attachTo: document.body })

		wrapper = select
		// `bundle:create` отложен на микрозадачу
		await nextTick()

		const [bundle] = select.emitted('bundle:create')?.[0] ?? []

		expect(select.props('value')).toBeUndefined()
		expect(bundle).toBeInstanceOf(TPluginBundle)
		expect(
			bundle instanceof TPluginBundle && bundle.getInstance<ISelect>()?.value,
		).toBeUndefined()
	})
})
