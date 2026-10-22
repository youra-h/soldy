/**
 * Помощник части (`createPartProps`) при гидратации: набор внутреннего узла,
 * которого у сервера не было.
 *
 * Набора у узла может и не быть (`undefined`), пока его не задал вход соседа
 * ниже: узел напечатан раньше, чем сосед вошёл, — у сервера в разметке, у
 * браузера во время гидратации. Первое значение мемо раскладки тогда
 * `undefined`, и мемо обязано отличить его от «ещё не считали»: иначе набор,
 * пришедший за гидратацию, оно приняло бы за первое значение, спред запомнил
 * бы его как записанный, и до узла он не дошёл бы
 * (`src/adapter/common/root.ts`, `createLayoutMemo`).
 *
 * Разметка сервера — фикстура из `markup/`, её пишет и сверяет серверный
 * прогон (`markup.server.spec.tsx`); страница — та же (`pages.tsx`).
 */

import { describe, it, expect } from 'vitest'
import { PartProbe } from './pages'
import { expectServedNodes, hydrateServed, serve } from './serve'
import partProbe from './markup/part-probe.html?raw'

describe('набор части · гидратация', () => {
	it('набор, которого у сервера не было, после гидратации — в узле', () => {
		const container = serve(partProbe)
		const served = [...container.querySelectorAll('span')]

		expect(served.map((node) => node.hasAttribute('data-probe'))).toEqual([false])

		hydrateServed(container, () => <PartProbe />)

		const nodes = [...container.querySelectorAll('span')]

		expectServedNodes(nodes, served)
		expect(nodes.map((node) => node.getAttribute('data-probe'))).toEqual(['entered'])
	})
})
