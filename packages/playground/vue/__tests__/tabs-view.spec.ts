/**
 * Геометрия активного таба не зависит от вида табов.
 *
 * `TTabsViewPlugin` — плагин темы oren (`@soldy/theme-oren/setup`, ставит его
 * `useTheme` в `__tests__/setup.ts`). Он пишет на список переменные полосы (`--underline-*`) и
 * разрыва линии (`--gap-*`), а после монтирования ставит `--ready-animation`.
 * Раньше он делал это только для видов `line` и `outline`, то есть знал имена
 * видов. Значения вида теперь объявляет тема, и у табов без `view` модификатора
 * нет вовсе — а полоса нужна именно им: вид блока по умолчанию у oren `line`.
 * Поэтому плагин пишет обе пары всегда, а какая нужна виду, решает тема.
 *
 * Сами значения в jsdom нулевые — раскладки нет, — проверяется, что
 * переменные записаны. Что полоса встаёт под активный таб, проверяет браузерный
 * прогон (`playground/vue/browser/tabs-layout.spec.ts`).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { Tabs, TabsItem } from '@soldy/ui-vue'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Табы из слота — строковым шаблоном, плоскими именами. */
const render = async (attrs: string) => {
	wrapper = mount(
		{
			components: { Tabs, TabsItem },
			template: `
				<Tabs ${attrs}>
					<TabsItem value="a" text="Первый" active />
					<TabsItem value="b" text="Второй" />
				</Tabs>
			`,
		},
		{ attachTo: document.body },
	)

	await nextFrame()
	await nextFrame()
}

const list = (): HTMLElement => {
	const found = document.querySelector('.s-tabs__list')

	if (!(found instanceof HTMLElement)) throw new Error('списка табов нет')

	return found
}

describe('геометрия активного таба без знания о виде', () => {
	it.each([
		['без view', ''],
		['с view темы', 'view="cards"'],
	])('%s: переменные полосы и разрыва записаны, анимация включена', async (_, attrs) => {
		await render(attrs)

		const style = list().style

		expect(style.getPropertyValue('--underline-pos')).not.toBe('')
		expect(style.getPropertyValue('--underline-size')).not.toBe('')
		expect(style.getPropertyValue('--gap-pos')).not.toBe('')
		expect(style.getPropertyValue('--gap-size')).not.toBe('')
		expect(document.querySelector('.s-tabs')?.classList).toContain('s-tabs--ready-animation')
	})
})
