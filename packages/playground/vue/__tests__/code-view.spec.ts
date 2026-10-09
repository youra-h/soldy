/**
 * Блок кода колонки: «Открыть в VS Code» отдаёт dev-серверу код и расширение
 * файла примера.
 *
 * Расширение — хоста, который написал код (`IPreviewSnippets.extension`): код
 * React в файле `.vue` редактор прочёл бы текстом. Сервер здесь — поддельный
 * `fetch`, который отказывает: так блок не уходит по адресу `vscode://`, а
 * переходов jsdom не умеет.
 */

import { afterEach, describe, it, expect, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import CodeView from '../src/components/CodeView.vue'

afterEach(() => {
	vi.unstubAllGlobals()
})

/** Кнопка блока по подписи; без неё проверять нечего. */
function buttonOf(wrapper: VueWrapper, text: string) {
	const found = wrapper.findAll('.s-button').find((button) => button.text() === text)

	if (!found) throw new Error(`нет кнопки «${text}»`)

	return found
}

describe('блок кода', () => {
	it('«Открыть в VS Code» шлёт серверу расширение файла примера', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new Error('нет сервера'))

		vi.stubGlobal('fetch', fetch)

		const code = 'export function Example() {}'
		const wrapper = mount(CodeView, { props: { code, name: 'Button-view', extension: 'tsx' } })

		await buttonOf(wrapper, 'View Code').trigger('click')
		await buttonOf(wrapper, 'Открыть в VS Code').trigger('click')

		const body = fetch.mock.calls[0]?.[1]?.body

		if (typeof body !== 'string') throw new Error('запрос ушёл без тела')

		expect(JSON.parse(body)).toEqual({ name: 'Button-view', code, extension: 'tsx' })

		wrapper.unmount()
	})
})
