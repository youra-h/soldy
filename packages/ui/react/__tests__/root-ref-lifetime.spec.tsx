/**
 * Ref корня после размонтирования не держит компонент.
 *
 * React хранит ref в узле своего дерева (fiber), и снятый узел живёт дольше
 * размонтирования: событийная система React DOM помнит узел последнего
 * события до следующего события на странице. У снятого узла React чистит
 * пропсы, состояние и эффекты, но не `ref`. Ref адаптера, замкнутый на
 * контекст, держал через такой узел размонтированный компонент целиком:
 * таблица после замены данных по ключу (`trackBy`) и размонтирования
 * оставалась в памяти со всеми строками и их записями до следующего события
 * (BENCHMARKS.md, «память после замены по ключу и размонтирования»).
 *
 * Без сборки мусора: что ref держит, видно по тому, куда он ведёт. Ref'ы
 * тест берёт там же, где узел дерева берёт React DOM, — на DOM-узлах, и
 * после размонтирования ни один из них не должен дойти до контекста.
 */

import { describe, it, expect, vi } from 'vitest'
import type { TTableColumnSource, TTableRecord } from '@soldy-ui/core'
import { ButtonDescriptor, createAdapterContext } from '@soldy-ui/setup'
import type { IAdapterContext } from '@soldy-ui/setup'
import { Table } from '@soldy-ui/react'
import { mount, nextFrame } from './mount'

/** Ref узла: так React зовёт его — с узлом и с `null`. */
type TRef = (element: Element | null) => void

const COLUMNS: TTableColumnSource[] = [
	{ field: 'name', text: 'Имя', rowHeader: true, sortable: true },
	{ field: 'age', text: 'Возраст', sortable: true },
]

/** Записи — каждый раз новые объекты с теми же ключами. */
function records(age: number): TTableRecord[] {
	return [
		{ id: 1, name: 'Анна', age },
		{ id: 2, name: 'Борис', age: age + 1 },
	]
}

function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/** Ключ записи — её `id`: и строка, и источник несут запись в `data`. */
const trackBy = (item: { data?: TTableRecord }): unknown => idOf(item.data)

function isRef(value: unknown): value is TRef {
	return typeof value === 'function'
}

/**
 * Ref'ы, которые React хранит в узлах своего дерева у DOM-узлов внутри
 * `root`. Узел дерева React DOM держит на DOM-узле под ключом
 * `__reactFiber$…` — оттуда его берёт и событийная система, когда запоминает
 * узел события.
 */
function keptRefs(root: Element): TRef[] {
	const refs: TRef[] = []

	for (const node of root.querySelectorAll('*')) {
		const key = Object.keys(node).find((name) => name.startsWith('__reactFiber$'))
		const fiber: unknown = key ? Reflect.get(node, key) : undefined
		const ref: unknown =
			typeof fiber === 'object' && fiber !== null ? Reflect.get(fiber, 'ref') : undefined

		if (isRef(ref)) refs.push(ref)
	}

	return refs
}

function hasBindElement(value: unknown): value is Pick<IAdapterContext, 'bindElement'> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'bindElement' in value &&
		typeof value.bindElement === 'function'
	)
}

/**
 * Прототип контекстов адаптера. Контексты компонентов тесту не видны, а класс
 * у всех один: шпион на прототипе видит обращение к любому из них.
 */
function contextPrototype(): Pick<IAdapterContext, 'bindElement'> {
	const probe = createAdapterContext(ButtonDescriptor(), { props: {} })
	const prototype: unknown = Object.getPrototypeOf(probe)

	probe.destroy()

	if (!hasBindElement(prototype)) throw new Error('у контекста адаптера нет bindElement')

	return prototype
}

describe('ref корня после размонтирования не держит компонент', () => {
	it('таблица: замена данных по ключу и размонтирование — ref узлов до контекстов не доходит', async () => {
		const view = (age: number) => (
			<Table
				items={records(age).map((data) => ({ data }))}
				columns={COLUMNS}
				mode="multiple"
				trackBy={trackBy}
			/>
		)
		const { container, render } = mount(view(30))

		await nextFrame()

		const rows = [...container.querySelectorAll('.s-table-row')]

		// Замена по ключу: строки те же и получают новые записи
		render(view(40))

		const replaced = [...container.querySelectorAll('.s-table-row')]

		expect(replaced).toHaveLength(2)
		replaced.forEach((row, index) => expect(row).toBe(rows[index]))
		expect(replaced[0].textContent).toContain('40')

		// Ref'ы адаптера — на корнях таблицы, колонок, строк, чекбоксов и кнопок
		const refs = keptRefs(container)

		expect(refs.length).toBeGreaterThan(0)

		render(<></>)

		const bindElement = vi.spyOn(contextPrototype(), 'bindElement')

		for (const ref of refs) ref(document.createElement('div'))

		expect(bindElement).not.toHaveBeenCalled()
	})
})
