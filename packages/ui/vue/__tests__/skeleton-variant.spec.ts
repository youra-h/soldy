/**
 * `variant` у Skeleton — проп, а не атрибут разметки.
 *
 * У `TSkeleton` есть состояние `variant`, событие `change:variant` и класс
 * `s-skeleton--<variant>`, а contribution пропа не объявлял. Поэтому
 * `<Skeleton variant="accent">` компилировался (проп есть в `ISkeletonProps`),
 * но до инстанса не доходил: Vue отдавал его в разметку атрибутом, и заглушка
 * оставалась `s-skeleton--normal`.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Skeleton } from '@soldy/ui-vue'

describe('Skeleton: variant', () => {
	it('доходит до инстанса: у корня класс варианта, атрибута variant нет', () => {
		const wrapper = mount(Skeleton, { props: { variant: 'accent' } })

		expect(wrapper.classes()).toContain('s-skeleton--accent')
		expect(wrapper.classes()).not.toContain('s-skeleton--normal')
		expect(wrapper.attributes('variant')).toBeUndefined()

		wrapper.unmount()
	})

	it('смена пропа меняет класс', async () => {
		const wrapper = mount(Skeleton, { props: { variant: 'accent' } })

		await wrapper.setProps({ variant: 'negative' })

		expect(wrapper.classes()).toContain('s-skeleton--negative')
		expect(wrapper.classes()).not.toContain('s-skeleton--accent')

		wrapper.unmount()
	})
})
