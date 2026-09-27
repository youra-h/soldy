/**
 * Готовый движок (`engine`) переходит к пересобранному списку.
 *
 * StrictMode и `<Activity>` уничтожают контексты списка и собирают их заново.
 * Без `ctrl` у новой сборки новый инстанс `TListBox` — новый владелец того же
 * движка. Прежний, уходя, отпускает движок, и новый ставит свои владельческие
 * расширения (`value`, `list`). Раньше движок помнил первого владельца
 * навсегда: новый получал в консоль «движок уже привязан к другому
 * компоненту», а `value` и выключенность элементов оставались привязаны к
 * уничтоженному инстансу.
 *
 * Консоль проверять отдельно не нужно: предупреждение роняет тест (`setup.ts`).
 */

import { describe, it, expect } from 'vitest'
import { Activity, StrictMode, act } from 'react'
import { createEngine } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import { ListBox, type ListBoxProps } from '@soldy-ui/react'
import { mount } from './mount'

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Строки элементов — на них `aria-selected` и `data-disabled`. */
const rows = () => [...document.querySelectorAll('.s-list-box-item .s-button')]

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

/** `data-disabled` всех строк по порядку. */
const disabled = () => rows().map((row) => row.getAttribute('data-disabled'))

/** Микрозадачи: набор плагинов и движок объявляются на них. */
async function flush(): Promise<void> {
	await act(async () => {})
}

/** Перерисовать список с новыми пропсами. */
type TRender = (props: ListBoxProps) => void

/**
 * Смонтировать список над движком снаружи с `value="b"` и пересобрать его, не
 * размонтируя: StrictMode делает это при монтировании, `<Activity>` — при
 * показе после скрытия.
 */
const REBUILDS: Readonly<
	Record<string, (engine: TCollectionEngine<TItem, any>) => Promise<TRender>>
> = {
	StrictMode: async (engine) => {
		const view = (props: ListBoxProps) => (
			<StrictMode>
				<ListBox engine={engine} {...props} />
			</StrictMode>
		)
		const { render } = mount(view({ value: 'b' }))

		await flush()

		return (props) => render(view(props))
	},
	'<Activity>': async (engine) => {
		const view = (props: ListBoxProps, mode: 'visible' | 'hidden' = 'visible') => (
			<Activity mode={mode}>
				<ListBox engine={engine} {...props} />
			</Activity>
		)
		const { render } = mount(view({ value: 'b' }))

		await flush()

		render(view({ value: 'b' }, 'hidden'))
		render(view({ value: 'b' }))
		await flush()

		return (props) => render(view(props))
	},
}

describe.each(Object.entries(REBUILDS))(
	'%s: готовый движок у пересобранного списка',
	(_, rebuild) => {
		it('value из пропсов выбирает элемент и после пересборки', async () => {
			const render = await rebuild(createEngine<TItem>({ items: ITEMS }))

			expect(selection()).toEqual(['false', 'true', 'false'])

			render({ value: 'c' })

			expect(selection()).toEqual(['false', 'false', 'true'])
		})

		it('выключенность списка доходит до элементов', async () => {
			const render = await rebuild(createEngine<TItem>({ items: ITEMS }))

			expect(disabled()).toEqual(['false', 'false', 'false'])

			render({ value: 'b', disabled: true })

			expect(disabled()).toEqual(['true', 'true', 'true'])
		})
	},
)
