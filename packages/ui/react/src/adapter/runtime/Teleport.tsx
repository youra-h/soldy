/**
 * Teleport — аналог `<teleport :to>` Vue: рисует содержимое в элементе по
 * селектору цели. Контейнер портала — одна обёртка на всё монтирование, и
 * двигается она, а не узлы React. AGENTS.md (React), «Teleport».
 */

import { useInsertionEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

/** Стиль обёртки и узла места: своей коробки у них нет. */
const CONTENTS: CSSProperties = { display: 'contents' }

/** Ключ портала — один на все рендеры: узел места рядом его не сдвинет. */
const PORTAL_KEY = 'teleport'

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала */
	disabled?: boolean
	children?: ReactNode
}

/** Фаза — только растёт: нет → на месте → в обёртке. */
type TPhase = 'none' | 'placed' | 'wrapped'

function targetOf(selector: string | undefined): Element | null {
	return selector ? document.querySelector(selector) : null
}

function advance(
	phase: TPhase,
	client: boolean,
	disabled: boolean,
	target: Element | null,
): TPhase {
	if (phase === 'wrapped') return phase

	if (!client) return disabled ? 'placed' : phase

	if (phase === 'placed') return disabled ? phase : 'wrapped'

	return disabled || target ? 'wrapped' : phase
}

/**
 * Обёртка и её место: цель, куда её положил insertion-эффект, или узел места,
 * куда её положил его ref.
 */
class TTeleportWrapper {
	/** Заводится на клиенте, когда впервые нужна. */
	private _node: HTMLDivElement | null = null
	private _target: Element | null = null
	private _place: Element | null = null

	get node(): HTMLDivElement {
		if (!this._node) {
			this._node = document.createElement('div')
			this._node.style.display = 'contents'
		}

		return this._node
	}

	/** Обёртку — в цель; цели нет — эффект её не трогает, очистки нет. */
	enter(target: Element | null): (() => void) | undefined {
		if (!target) return undefined

		target.appendChild(this.node)
		this._target = target

		return this.leave
	}

	readonly leave = (): void => {
		this._takeFrom(this._target)
		this._target = null
	}

	/** Ref узла места: обёртку — в него, при снятии — вон из него. */
	readonly place = (node: HTMLDivElement | null): void => {
		if (node) node.appendChild(this.node)
		else this._takeFrom(this._place)

		this._place = node
	}

	private _takeFrom(parent: Element | null): void {
		const node = this._node

		if (node && parent && node.parentNode === parent) node.remove()
	}
}

export function Teleport({ to, disabled = false, children }: TTeleportProps): ReactNode {
	const client = useSyncExternalStore(subscribe, onClient, onServer)
	const [wrapper] = useState(() => new TTeleportWrapper())
	// С `disabled` цель не нужна: обёртку держит узел места
	const target = client && !disabled ? targetOf(to) : null
	const [stored, setPhase] = useState(() => advance('none', client, disabled, target))
	const phase = advance(stored, client, disabled, target)

	if (phase !== stored) setPhase(phase)

	const into = phase === 'wrapped' ? target : null

	// Раньше, чем React привяжет ref узлов панели
	useInsertionEffect(() => wrapper.enter(into), [wrapper, into])

	if (phase === 'none') return null

	if (phase === 'placed') return children

	return (
		<>
			{disabled ? <div ref={wrapper.place} style={CONTENTS} /> : null}
			{createPortal(children, wrapper.node, PORTAL_KEY)}
		</>
	)
}
