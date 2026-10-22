/**
 * Гидратация ListBox: структура разметки после элементов читает живое
 * состояние.
 *
 * Сервер печатает разметку в порядке документа: слот пустого списка стоит
 * после элементов, и решает он о нём, когда элементы уже вошли в коллекцию, —
 * слота в его разметке нет. Браузер гидратирует в том же порядке, и
 * состояние, которое к этому месту сменили элементы, должно дойти до `Show`
 * сразу. Поэтому сменившееся во время гидратации придерживает не стор
 * адаптера, а раскладка спреда (`src/adapter/common/root.ts`, шапка,
 * «Гидратация»): придержанный стор показал бы `Show` список без элементов, и
 * Solid искал бы узлы слота, которых сервер не печатал (`Hydration Mismatch`).
 *
 * Разметку сервера рисует перед прогоном его `globalSetup` (`server.tsx`);
 * страница — та же (`pages.tsx`).
 */

import { describe, it, expect } from 'vitest'
import { ListBoxWithEmpty } from './pages'
import { expectServedNodes, hydrateServed, markupOf, serve } from './serve'

describe('ListBox · гидратация', () => {
	it('слот пустого списка после элементов: у сервера его нет, у браузера — тоже', () => {
		const container = serve(markupOf('list-box-with-empty'))
		const served = [...container.querySelectorAll('[role="option"]')]

		expect(served).toHaveLength(1)
		expect(container.querySelector('.empty')).toBeNull()

		hydrateServed(container, () => <ListBoxWithEmpty />)

		expectServedNodes([...container.querySelectorAll('[role="option"]')], served)
		expect(container.querySelector('.empty')).toBeNull()
	})
})
