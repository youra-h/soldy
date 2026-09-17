/**
 * `variant` у Skeleton — проп, а не атрибут разметки.
 *
 * У `TSkeleton` есть состояние `variant`, событие `change:variant` и
 * модификатор `s-skeleton--variant-<variant>`, а contribution пропа не
 * объявлял. Поэтому `<Skeleton variant="…">` компилировался (проп есть в
 * `ISkeletonProps`), но до инстанса не доходил: Vue отдавал его в разметку
 * атрибутом, и модификатора у заглушки не было.
 *
 * Значения — из фикстуры темы (`__tests__/theme.d.ts`).
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Skeleton } from '@soldy/ui-vue'

const variantClasses = (classes: string[]) => classes.filter((name) => name.includes('--variant-'))

describe('Skeleton: variant', () => {
	it('доходит до инстанса: у корня класс варианта, атрибута variant нет', () => {
		const wrapper = mount(Skeleton, { props: { variant: 'brand' } })

		expect(variantClasses(wrapper.classes())).toEqual(['s-skeleton--variant-brand'])
		expect(wrapper.attributes('variant')).toBeUndefined()

		wrapper.unmount()
	})

	it('смена пропа меняет класс', async () => {
		const wrapper = mount(Skeleton, { props: { variant: 'brand' } })

		await wrapper.setProps({ variant: 'danger' })

		expect(variantClasses(wrapper.classes())).toEqual(['s-skeleton--variant-danger'])

		wrapper.unmount()
	})
})
