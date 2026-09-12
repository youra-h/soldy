import { it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { h } from 'vue'
import { Select, SelectItem } from '@soldy/ui-vue'

import '@soldy/theme-oren'

const make = (size: string) => ({
	render: () =>
		h('div', { style: 'width: 420px' }, [
			h(
				Select,
				{ mode: 'multiple', size, clearable: true, placeholder: 'Выберите' },
				{ default: () => [h(SelectItem, { value: '0', text: 'Москва' })] },
			),
		]),
})

const h_ = (s: string) => {
	const el = document.querySelector(s)
	return el ? +el.getBoundingClientRect().height.toFixed(1) : -1
}

it('m', async () => {
	document.documentElement.dataset.theme = 'oren'
	const out: string[] = []

	for (const size of ['sm', 'normal', 'lg']) {
		document.body.innerHTML = ''
		render(make(size))

		const before = h_('.s-select')
		const clear = h_('.s-select__clear')

		await userEvent.click(document.querySelector('.s-select__field input') as HTMLElement)
		await userEvent.click(document.querySelector('[role="option"]') as HTMLElement)
		await new Promise((r) => setTimeout(r, 60))

		out.push(
			`${size}: без_тега=${before} с_тегом=${h_('.s-select')} тег=${h_('.s-tags-item')} кнопка_clear=${clear}`,
		)
	}

	throw new Error('M || ' + out.join(' || '))
})
