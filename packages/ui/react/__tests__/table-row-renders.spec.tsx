/**
 * Перерисовки строк Table в React.
 *
 * Строка — под границей перерисовки адаптера (`withRenderBoundary`). Таблица
 * перерисовывается от смены своего пропа и на каждый выбор — счёт выбора её
 * состояние, — а строку перерисовывают только её собственная подписка (выбор
 * пишет строке `data-selected`) и смена её входов: экземпляра и слота `cell`.
 * Без границы React перерисовывал бы вместе с таблицей все её строки.
 *
 * Рендер строки считает хук её сборки (`useSetupTableRow`): строка зовёт его
 * ровно раз за рендер. Шпиона на нём ставит `vi.mock` с `spy: true` — хук
 * работает как есть, — а мок действует на весь файл, поэтому группа живёт
 * отдельно от `table.spec.tsx`. Ячейки и слот `cell` — там, в группе
 * «перерисовка ячеек».
 */

import { describe, it, expect, vi } from 'vitest'
import { act, type ReactElement } from 'react'
import { Table } from '@soldy-ui/react'
import { createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableRecord } from '@soldy-ui/core'
import { useSetupTableRow } from '../src/components/table/row/setup.component'
import { mount, nextFrame, type TMounted } from './mount'

vi.mock('../src/components/table/row/setup.component', { spy: true })

const rowRenders = vi.mocked(useSetupTableRow)

/** Ключ записи — её `id`. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/** Движок строк снаружи: три записи, две колонки, режим выбора. */
function engineOf(mode: TSelectionMode): TTableCollection {
	const engine = createEngineTable({
		items: [
			{ data: { id: 1, name: 'Анна', age: 30 } },
			{ data: { id: 2, name: 'Борис', age: 41 } },
			{ data: { id: 3, name: 'Вера', age: 25 } },
		],
	})

	engine.extensions.batch.trackBy = (row) => idOf(row.data)
	engine.extensions.columns.columns = [
		{ field: 'name', text: 'Имя', rowHeader: true },
		{ field: 'age', text: 'Возраст' },
	]
	engine.extensions.selection.mode = mode

	return engine
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Поле чекбокса по селектору его обёртки. */
function checkBoxInput(selector: string, root: ParentNode = document): HTMLInputElement {
	const input = find(selector, root).querySelector('input')

	if (!(input instanceof HTMLInputElement)) throw new Error(`${selector}: поля чекбокса нет`)

	return input
}

/** Клик — как его шлёт браузер, в `act`: выбор перерисовывает таблицу. */
function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Отметка выбора строк. */
const rowsSelected = () =>
	[...document.querySelectorAll<HTMLElement>('.s-table-row')].map((row) => row.dataset.selected)

/** Ключи записей отрисованных строк — по рендеру, в порядке ключей. */
const renderedRows = () => rowRenders.mock.calls.map(([props]) => idOf(props.ctrl?.data)).sort()

/** Смонтировать и дождаться кадра; считаются рендеры строк после монтирования. */
async function renderCounted(element: ReactElement): Promise<TMounted> {
	const mounted = mount(element)

	await nextFrame()

	// Строки нарисованы этим хуком: иначе счётчик ниже ничего бы не стерёг
	expect(renderedRows()).toContain(1)
	rowRenders.mockClear()

	return mounted
}

describe('перерисовка строк', () => {
	it('монтирование — каждая строка по разу', async () => {
		rowRenders.mockClear()
		mount(<Table engine={engineOf('none')} />)

		await nextFrame()

		expect(renderedRows()).toEqual([1, 2, 3])
	})

	it('таблица перерисована сменой пропа — строки нет', async () => {
		const engine = engineOf('none')
		const view = (label: string) => <Table engine={engine} aria_label={label} />
		const { render: rerender } = await renderCounted(view('Люди'))

		rerender(view('Сотрудники'))

		expect(find('.s-table').getAttribute('aria-label')).toBe('Сотрудники')
		expect(renderedRows()).toEqual([])
	})

	it('выбор строки — перерисована она одна', async () => {
		await renderCounted(<Table engine={engineOf('multiple')} />)

		const vera = [...document.querySelectorAll<HTMLElement>('.s-table-row')][2]

		click(checkBoxInput('.s-table-row__select', vera))

		expect(rowsSelected()).toEqual(['false', 'false', 'true'])
		expect(renderedRows()).toEqual([3])
	})

	it('«выбрать все» и снятие выбора — каждая строка по разу на клик', async () => {
		await renderCounted(<Table engine={engineOf('multiple')} />)

		const head = checkBoxInput('.s-table__select')

		click(head)

		expect(rowsSelected()).toEqual(['true', 'true', 'true'])
		expect(renderedRows()).toEqual([1, 2, 3])

		rowRenders.mockClear()
		click(head)

		expect(rowsSelected()).toEqual(['false', 'false', 'false'])
		expect(renderedRows()).toEqual([1, 2, 3])
	})
})
