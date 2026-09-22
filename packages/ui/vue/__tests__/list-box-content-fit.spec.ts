/**
 * `content-fit` элемента ListBox — своё значение поверх списочного.
 *
 * Проп трёхзначен: `undefined` значит «как у списка», и это не то же самое,
 * что `truncate`. Разрешение и `data-content-fit` — дело ядра (тесты
 * `core/__tests__/list-box.spec.ts`); здесь проверяется, что адаптер доносит
 * до элемента и снятие пропа. Раньше `undefined` не доезжал до ядра вовсе, и
 * элемент оставался с последним заданным значением.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ListBox, ListBoxItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Список с `truncate`, у элемента своё значение из пропа `fit`. */
const Harness = {
	components: { ListBox, ListBoxItem },
	props: { fit: { type: String, default: undefined } },
	template: `
		<ListBox content-fit="truncate">
			<ListBoxItem value="a" text="A" :content-fit="fit" />
		</ListBox>
	`,
}

const mountHarness = async (fit?: string) => {
	const mounted = mount(Harness, { props: { fit }, attachTo: document.body })

	wrapper = mounted
	await nextTick()

	return mounted
}

const contentFit = () =>
	document.querySelector('.s-list-box-item')?.getAttribute('data-content-fit')

describe('ListBox.Item: снятый content-fit возвращает значение списка', () => {
	it('задан после монтирования, потом снят', async () => {
		const mounted = await mountHarness()

		expect(contentFit()).toBe('truncate')

		await mounted.setProps({ fit: 'wrap' })

		expect(contentFit()).toBe('wrap')

		await mounted.setProps({ fit: undefined })

		expect(contentFit()).toBe('truncate')
	})

	it('задан при монтировании, потом снят', async () => {
		const mounted = await mountHarness('wrap')

		expect(contentFit()).toBe('wrap')

		await mounted.setProps({ fit: undefined })

		expect(contentFit()).toBe('truncate')
	})
})
