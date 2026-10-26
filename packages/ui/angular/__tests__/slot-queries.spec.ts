/**
 * The slot query (`contentChildren(SlotDirective)`): the base gets the slot
 * templates from `slotTemplates`, and the query is declared by the generated
 * surface — only where the component reads slots (`slot()` in its template or
 * class). A content query costs every instance — its signal, its list and its
 * place in the view, — and an item row or an icon inside every element of a
 * collection reads no slots. AGENTS.md (Angular), «Генератор: запросы узлов
 * шаблона».
 */

import { describe, it, expect } from 'vitest'
import { ɵgetComponentDef, ɵgetDirectiveDef } from '@angular/core'
import {
	TButtonComponent,
	TComponentBase,
	TIconComponent,
	TItemRowComponent,
	TListBoxItemComponent,
} from '@soldy-ui/angular'
import { exportedDeclarations } from './declarations'

/** Content queries of a component or directive — a function of its Angular definition, none — `null`. */
const contentQueriesOf = (type: unknown) =>
	typeof type === 'function'
		? (ɵgetComponentDef(type) ?? ɵgetDirectiveDef(type))?.contentQueries
		: undefined

/** The surface overrode `slotTemplates` — so it declared the slot query. */
const queriesSlots = (type: { prototype: object }) =>
	Reflect.get(type.prototype, 'slotTemplates') !==
	Reflect.get(TComponentBase.prototype, 'slotTemplates')

describe('запрос слотов', () => {
	it('у компонента, который слотов не читает, запроса нет: строка элемента, иконка', () => {
		expect(contentQueriesOf(TItemRowComponent)).toBeNull()
		expect(contentQueriesOf(TIconComponent)).toBeNull()
	})

	it('у компонента со слотами — запрос: кнопка, элемент списка', () => {
		expect(contentQueriesOf(TButtonComponent)).toBeTypeOf('function')
		expect(contentQueriesOf(TListBoxItemComponent)).toBeTypeOf('function')
	})

	it('запрос слотов есть только у поверхностей, которые читают слоты', () => {
		const declarations = exportedDeclarations().filter(({ soldy }) => soldy)

		expect(declarations.length).toBeGreaterThan(0)

		for (const { name, type } of declarations) {
			expect([name, contentQueriesOf(type) !== null]).toEqual([name, queriesSlots(type)])
		}
	})
})
