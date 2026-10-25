/**
 * Запросы узлов шаблона (`viewChild`): узел ссылки `#root`, `#control`,
 * `#companion` база берёт у `templateNode`, а запросы объявляет
 * сгенерированная поверхность — только на ссылки шаблона своего компонента.
 * Запрос Angular копирует себя в каждое представление шаблона — блок `@if`,
 * итерацию `@for`, — и запрос без ссылки стоил памяти на каждый блок: у строки
 * таблицы — около 140 копий на строку. AGENTS.md (Angular), «Корень внутри
 * обёртки — окно таблицы».
 */

import { describe, it, expect } from 'vitest'
import { ɵgetComponentDef } from '@angular/core'
import {
	TButtonComponent,
	TCheckBoxComponent,
	TComponentBase,
	TTableComponent,
	TTableRowComponent,
} from '@soldy-ui/angular'
import { exportedDeclarations } from './declarations'

/** Запросы представления компонента — функция из описания Angular, без них `null`. */
const viewQueryOf = (type: unknown) =>
	typeof type === 'function' ? ɵgetComponentDef(type)?.viewQuery : undefined

/** Поверхность переопределила `templateNode` — значит, объявила запросы. */
const queriesNodes = (type: { prototype: object }) =>
	Reflect.get(type.prototype, 'templateNode') !==
	Reflect.get(TComponentBase.prototype, 'templateNode')

describe('запросы узлов шаблона', () => {
	it('у компонента без ссылок в шаблоне запросов нет: строка таблицы, кнопка', () => {
		expect(viewQueryOf(TTableRowComponent)).toBeNull()
		expect(viewQueryOf(TButtonComponent)).toBeNull()
	})

	it('у компонента со ссылкой — запрос: корень таблицы, поле чекбокса', () => {
		expect(viewQueryOf(TTableComponent)).toBeTypeOf('function')
		expect(viewQueryOf(TCheckBoxComponent)).toBeTypeOf('function')
	})

	it('запросы есть только у поверхностей, которые отдают узлы шаблона', () => {
		const components = exportedDeclarations().filter(
			({ kind, soldy }) => kind === 'component' && soldy,
		)

		expect(components.length).toBeGreaterThan(0)

		for (const { name, type } of components) {
			expect([name, viewQueryOf(type) !== null]).toEqual([name, queriesNodes(type)])
		}
	})
})
