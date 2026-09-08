/**
 * `mode` у Collapse — регрессионный тест.
 *
 * До выноса фасадов на общую базу `<Collapse mode="multiple">` молча не
 * работал: contribution объявлял проп записываемым, а сеттера у фасада не
 * было. Раскрытие второй секции закрывало первую, и харнесс `Collapse.test.vue`,
 * который использует `mode="multiple"`, всё это время проверял не то.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Harness from './Collapse.test.vue'

describe('Collapse mode="multiple"', () => {
	it('держит две секции раскрытыми одновременно', async () => {
		const wrapper = mount(Harness, { attachTo: document.body })

		await wrapper.findAll('.s-collapse-item__header')[1].trigger('click')
		await nextTick()

		const open = wrapper
			.findAll('.s-collapse-item')
			.filter((item) => item.attributes('data-selected') === 'true')

		expect(open).toHaveLength(2)
	})
})
