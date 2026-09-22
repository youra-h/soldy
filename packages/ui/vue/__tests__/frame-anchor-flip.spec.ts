/**
 * `anchor_flip` у Frame, который объявлен разметкой.
 *
 * Vue превращает отсутствующий Boolean-проп без `default` в `false`, а сборка
 * (`applyInitialProps`) пропускает только `undefined` и значение, равное
 * объявленному умолчанию. У плагина якоря flip
 * по умолчанию включён, поэтому Frame, в разметке которого `anchor_flip` не
 * написан, обязан оставить flip включённым. Иначе проп молча выключил бы flip у
 * всех Frame.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { Frame } from '@soldy-ui/vue'
import { TAnchorPlugin } from '@soldy-ui/plugins'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

afterEach(() => {
	document.body.innerHTML = ''
})

describe('anchor_flip', () => {
	it('Frame без anchor_flip оставляет flip включённым', async () => {
		const wrapper = mount(Frame, {
			props: { visible: true, position: 'fixed' },
			attachTo: document.body,
		})

		await nextFrame()

		const [plugin] = wrapper.emitted('anchor:create')?.[0] ?? []

		expect(plugin).toBeInstanceOf(TAnchorPlugin)
		expect(plugin instanceof TAnchorPlugin && plugin.flip).toBe(true)

		wrapper.unmount()
	})
})
