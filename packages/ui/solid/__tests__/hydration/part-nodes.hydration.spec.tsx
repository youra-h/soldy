/**
 * Узлы частей и корни при гидратации. Узлы записей (`createPartNodes`), узел
 * части (`createPartNode`) и корень (`Root`) создают узлы сами, мимо шаблонов
 * компилятора, — и в окне гидратации обязаны взять узлы сервера по их ключам,
 * а не нарисовать свои. После гидратации смена записи пишется в тот же узел.
 *
 * Флажок «выбрать все» в шапке таблицы — корень флажка (`Root`) и его поле
 * (`createPartNode`).
 *
 * Разметку сервера рисует перед прогоном его `globalSetup` (`server.tsx`);
 * страницы — те же (`pages.tsx`).
 */

import { describe, it, expect } from 'vitest'
import { createSignal } from 'solid-js'
import { PART_NODES_RECORDS, PartNodesProbe, TableSelectable, type TProbeRecord } from './pages'
import { expectServedNodes, hydrateServed, markupOf, serve } from './serve'

describe('узлы записей · гидратация', () => {
	it('узлы — сервера, с его текстом; после гидратации запись — в тот же узел', () => {
		const container = serve(markupOf('part-nodes-probe'))
		const served = [...container.querySelectorAll('li')]
		const [records, setRecords] = createSignal<readonly TProbeRecord[]>(PART_NODES_RECORDS)

		hydrateServed(container, () => <PartNodesProbe records={records} />)

		const nodes = [...container.querySelectorAll('li')]

		expectServedNodes(nodes, served)
		expect(nodes.map((node) => node.textContent)).toEqual(['A', 'B'])

		setRecords([
			{ key: 'b', text: 'B2' },
			{ key: 'c', text: 'C' },
		])

		const changed = [...container.querySelectorAll('li')]

		expect(changed[0]).toBe(served[1])
		expect(changed.map((node) => node.textContent)).toEqual(['B2', 'C'])
		expect(changed.map((node) => node.getAttribute('data-key'))).toEqual(['b', 'c'])
	})
})

describe('узел части и корень · гидратация', () => {
	it('флажок шапки таблицы — корень и поле сервера', () => {
		const container = serve(markupOf('table-selectable'))
		const selector =
			'.so-table__select, .so-table__select .so-check-box, .so-table__select input'
		const served = [...container.querySelectorAll(selector)]

		expect(served).toHaveLength(3)

		hydrateServed(container, () => <TableSelectable />)

		expectServedNodes([...container.querySelectorAll(selector)], served)
	})
})
