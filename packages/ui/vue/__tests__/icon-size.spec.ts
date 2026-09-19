/**
 * Размер иконки из разметки — с первой отрисовки.
 *
 * `width` и `height` кладёт в `:style` корня плагин раскладки. Он следил
 * только за сменой размера, а размер, с которым иконку собрали, приходит в
 * инстанс без события: своему инстансу — конструктором, внешний `ctrl` держит
 * его сам. Поэтому `<Icon :width="24">` рисовалась размером по умолчанию, пока
 * размер не поменяют.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { TIcon } from '@soldy/core'
import { Icon } from '@soldy/ui-vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

describe('Icon: размер из разметки', () => {
	it('width и height стоят в style с монтирования', () => {
		wrapper = mount(Icon, { props: { width: 24, height: '2em' } })

		expect(wrapper.attributes('style')).toContain('width: 24px')
		expect(wrapper.attributes('style')).toContain('height: 2em')
	})

	it('внешний ctrl с размером — тоже', () => {
		wrapper = mount(Icon, { props: { ctrl: new TIcon({ width: 32 }) } })

		expect(wrapper.attributes('style')).toContain('width: 32px')
		expect(wrapper.attributes('style')).not.toContain('height')
	})

	it('без размеров атрибута style нет: размер даёт size', () => {
		wrapper = mount(Icon)

		expect(wrapper.attributes('style')).toBeUndefined()
		expect(wrapper.classes()).toContain('s-icon--size-normal')
	})
})
