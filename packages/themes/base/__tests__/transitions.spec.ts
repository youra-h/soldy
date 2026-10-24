// @vitest-environment jsdom

/**
 * `afterPseudoTransitions` — когда `TTabsViewPlugin` снимает признак переезда
 * отметки активного таба: переходы псевдоэлементов списка доиграли.
 *
 * Код, который ждёт движение темы, завершается и без него
 * (`docs/agents/theming.md`, «Движение: один режим на библиотеку»): нет
 * переходов или нет Web Animations вовсе, как в jsdom, — ожидание кончается
 * тем же кадром. Как признак снимается после настоящих переходов, —
 * `playground/vue/browser/tabs-line.spec.ts` и `tabs-contained.spec.ts`.
 */

import { describe, it, expect, vi } from 'vitest'
import { afterPseudoTransitions } from '../setup/plugins/transitions'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

describe('afterPseudoTransitions', () => {
	it('без переходов ожидание кончается кадром позже', async () => {
		const done = vi.fn()

		afterPseudoTransitions(document.createElement('div'), done)
		expect(done).not.toHaveBeenCalled()

		await nextFrame()
		await nextFrame()
		expect(done).toHaveBeenCalledOnce()
	})

	it('после отмены done не зовётся', async () => {
		const done = vi.fn()

		afterPseudoTransitions(document.createElement('div'), done)()

		await nextFrame()
		await nextFrame()
		expect(done).not.toHaveBeenCalled()
	})
})
