import '@soldy-ui/webc'
import type { TRec } from '../data'
import { columns, tableProps, virtual, width } from '../soldy-setup'

export { sel } from '../soldy-setup'

/**
 * Таблица soldy на Web Components — те же колонки, флаги и обёртки, что у Vue:
 * элемент `<div is="so-table">`, пропсы — свойствами элемента. Окно — автономный
 * `<so-virtual>` вокруг таблицы в контейнере высотой 800 px. Первые строки элемент
 * получает до вставки в документ — как таблица Vue при создании.
 */
const items = (rows: TRec[]) => rows.map((data) => ({ data }))
let table: HTMLElement | null = null
let outer: HTMLElement | null = null

export function render(host: Element, rows: TRec[] | null) {
	if (!rows) {
		outer?.remove()
		outer = table = null
		return
	}

	if (!table) {
		table = document.createElement('div', { is: 'so-table' })
		for (const [name, value] of Object.entries({ columns, ...tableProps }))
			Reflect.set(table, name, value)
		outer = table

		if (virtual) {
			const windowed = document.createElement('so-virtual')
			const scroll = document.createElement('div')

			windowed.append(table)
			scroll.className = 'bench-scroll'
			scroll.style.cssText = 'height: 800px; overflow: auto'
			scroll.append(windowed)
			outer = scroll
		}

		if (width) {
			const box = document.createElement('div')

			box.style.width = `${width}px`
			box.append(outer)
			outer = box
		}

		Reflect.set(table, 'items', items(rows))
		host.append(outer)
		return
	}

	Reflect.set(table, 'items', items(rows))
}
