/**
 * `mode` у Accordion — регрессионный тест.
 *
 * До выноса фасадов на общую базу `<Accordion mode="multiple">` молча не
 * работал: contribution объявлял проп записываемым, а сеттера у фасада не
 * было. Раскрытие второй секции закрывало первую, и харнесс `Accordion.test.vue`,
 * который использует `mode="multiple"`, всё это время проверял не то.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Harness from './Accordion.test.vue'

describe('Accordion mode="multiple"', () => {
	it('держит две секции раскрытыми одновременно', async () => {
		const wrapper = mount(Harness, { attachTo: document.body })

		await wrapper.findAll('.s-accordion-item__header')[1].trigger('click')
		await nextTick()

		const open = wrapper
			.findAll('.s-accordion-item')
			.filter((item) => item.attributes('data-selected') === 'true')

		expect(open).toHaveLength(2)
	})
})
