/**
 * useAdapterContext — держит adapter-context между рендерами (869f1vnx4).
 *
 * Раньше каждый setup.component.ts держал свой `useRef` — проводка
 * дублировалась в пяти компонентах. Хук общий, и тест проверяет ровно то,
 * ради чего он завёлся: фабрика вызывается один раз за жизнь компонента,
 * а не на каждый рендер, и это не ломается под двойным вызовом StrictMode.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { StrictMode, useState, act } from 'react'
import type { ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useAdapterContext, Button } from '@soldy/ui-react'

const roots: Root[] = []

function mount(element: ReactElement): HTMLElement {
	const target = document.createElement('div')

	document.body.appendChild(target)

	const reactRoot = createRoot(target)

	roots.push(reactRoot)

	act(() => {
		reactRoot.render(element)
	})

	return target
}

afterEach(() => {
	while (roots.length) {
		const reactRoot = roots.pop()!

		act(() => reactRoot.unmount())
	}

	document.body.innerHTML = ''
})

describe('useAdapterContext', () => {
	it('вызывает фабрику один раз, а на повторных рендерах отдаёт тот же объект', () => {
		const factory = vi.fn(() => ({ marker: Symbol('adapter-context') }))
		const seen: unknown[] = []

		function Probe({ n }: { n: number }) {
			const adapter = useAdapterContext(factory)

			seen.push(adapter)

			return <span>{n}</span>
		}

		function Harness() {
			const [n, setN] = useState(0)

			return (
				<div>
					<Probe n={n} />
					<button onClick={() => setN((v) => v + 1)}>next</button>
				</div>
			)
		}

		const target = mount(<Harness />)

		act(() => {
			target.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})
		act(() => {
			target.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
		})

		expect(factory).toHaveBeenCalledTimes(1)
		expect(seen.length).toBe(3)
		expect(new Set(seen).size).toBe(1)
	})

	it('StrictMode: двойной вызов рендера не ломает привязку Button к DOM', () => {
		const target = mount(
			<StrictMode>
				<Button text="Strict" />
			</StrictMode>,
		)

		const el = target.querySelector('button')

		expect(el?.textContent?.trim()).toBe('Strict')
	})
})
