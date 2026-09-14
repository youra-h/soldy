/**
 * `createVueAdapterContext` — единственное место, где Vue-компонентам был
 * нужен `toRaw` (21 файл `setup.component.ts`, см. AGENTS.md, «Vue collection
 * setup»). Компоненты его больше не вызывают — обёртка снимает прокси с
 * `ctrl` и со значений верхнего уровня `options` (в частности `engine`) сама,
 * прежде чем отдать их ядру, которое `vue` не импортирует и прокси не ждёт.
 */

import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { defineComponent } from '@soldy/setup'
import { createVueAdapterContext } from '../src/adapter'

describe('createVueAdapterContext', () => {
	it('снимает Vue-прокси с готового ctrl', () => {
		class Simple {
			value = 1
		}

		const raw = new Simple()
		const proxied = reactive(raw)

		expect(proxied).not.toBe(raw)

		const ctx = createVueAdapterContext(
			defineComponent({ ctor: Simple }),
			{ ctrl: proxied },
			{ defaultExtensions: [] },
		)

		expect(ctx.instance).toBe(raw)
	})

	it('доходит до ядра без прокси, если ctrl не передан', () => {
		class Simple {
			value = 1
		}

		const ctx = createVueAdapterContext(
			defineComponent({ ctor: Simple }),
			{},
			{ defaultExtensions: [] },
		)

		expect(ctx.instance).toBeInstanceOf(Simple)
	})

	it('снимает Vue-прокси со значений верхнего уровня options (engine)', () => {
		class TEngineOwner {
			readonly engine: object

			constructor(_props: object, options: { engine: object }) {
				this.engine = options.engine
			}
		}

		const engine = { items: [] as unknown[] }
		const proxiedEngine = reactive(engine)

		expect(proxiedEngine).not.toBe(engine)

		const ctx = createVueAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ options: { engine: proxiedEngine } },
			{ defaultExtensions: [] },
		)

		expect(ctx.instance.engine).toBe(engine)
	})
})
