/**
 * Teleport — аналог `<teleport :to>` Vue: рисует содержимое в другом месте
 * документа, в элементе по селектору цели. Так Frame уводит панель в `body`,
 * из-под `overflow` и контекстов наложения предков.
 *
 * **Обёртка.** Портал React (`createPortal`) переиспользует содержимое, только
 * пока контейнер тот же (`containerInfo`): портал в другой контейнер React
 * собирает заново — панель вместе с тем, что набрано в её полях. Поэтому
 * контейнер у портала один на всё монтирование Teleport — обёртка, обычный
 * `div` со стилем `display: contents`, без класса и `data-*`, — React всегда
 * рисует содержимое в неё, а Teleport двигает саму обёртку: в цель, с
 * `disabled` — в узел места, без цели — вон из документа. Узлы, которые
 * рисует React, Teleport не переносит.
 *
 * Узел места — такой же `div`, и рисует его React — перед порталом и только с
 * `disabled`: перестановку по ключу и снятие предка React делает со своими
 * узлами, и обёртка в узле места ходит вместе с местом. У портала постоянный
 * ключ: узел места, появившись рядом, его не сдвинет.
 *
 * **Фаза** у Teleport одна и только растёт:
 *
 * - «нет» — содержимого нет: на сервере и при гидратации без `disabled`, на
 *   клиенте — пока нет ни цели, ни `disabled`. Без цели содержимое не
 *   собирается;
 * - «на месте» — дети прямо на месте, без обёртки, как их рисует сервер, — и
 *   только после серверной разметки: панель с `disabled`, которую React
 *   гидратировал, остаётся такой, пока не уйдёт с места;
 * - «в обёртке» — с первого ухода с места или с первого места на клиенте
 *   (цель или `disabled`), и навсегда. Цель пропала на лету — обёртка вне
 *   документа, вернулась — получает тот же узел.
 *
 * Цена: панель, начавшая на месте после серверной разметки, при первом уходе
 * с места один раз собирается заново. Без гидратации панель с `disabled` с
 * первого рендера сразу в обёртке.
 *
 * Фаза — состояние React, а не поле объекта, которое меняет рендер:
 * отброшенный рендер её не сдвинет. Пишет её сам рендер — так React разрешает
 * запоминать сведения из прошлых рендеров.
 *
 * **Порядок.** Панель уже в документе, когда React зовёт её ref и ref
 * потребителя. В цель обёртку кладёт insertion-эффект: он идёт в фазе
 * мутаций — после вставки содержимого портала и раньше, чем React привяжет
 * ref узлов. На место её кладёт ref узла места: узел стоит перед порталом, и
 * его ref React привязывает раньше ref панели. Layout-эффект пришёл бы позже
 * ref панели, а вставка в рендере под StrictMode оставляла бы в цели лишние
 * обёртки.
 *
 * Портал React серверный рендер не поддерживает и роняет его. Сервер от
 * клиента отличает снимок `useSyncExternalStore`: на сервере и при гидратации
 * React берёт серверный, а сразу после гидратации перерисовывает компонент с
 * клиентским. Подписываться при этом не на что. Цель ищется при рендере, на
 * клиенте.
 */

import { useInsertionEffect, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

/** Стиль обёртки и узла места: своей коробки у них нет. */
const CONTENTS: CSSProperties = { display: 'contents' }

/** Ключ портала — один на все рендеры. */
const PORTAL_KEY = 'teleport'

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала */
	disabled?: boolean
	children?: ReactNode
}

/** Фаза Teleport — только растёт: нет → на месте → в обёртке (см. шапку). */
type TPhase = 'none' | 'placed' | 'wrapped'

/** Цель по селектору. */
function targetOf(selector: string | undefined): Element | null {
	return selector ? document.querySelector(selector) : null
}

/**
 * Фаза после этого рендера. На сервере и при гидратации дети с `disabled` —
 * на месте, как их рисует сервер. На клиенте панель на месте остаётся там,
 * пока `disabled`, а уходя с места, идёт в обёртку; панель без фазы — как
 * только появилась цель или `disabled`.
 */
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
 * Обёртка Teleport и её место: цель, куда её положил insertion-эффект, или
 * узел места, куда её положил его ref.
 *
 * Ref узла места и очистка эффекта живут дольше рендера, поэтому это стрелки
 * объекта класса, а не замыкания в теле Teleport: замыкание держало бы всю
 * область своего рендера (AGENTS.md, «Функция адаптера React, которая живёт
 * дольше рендера, принадлежит объекту класса»).
 */
class TTeleportWrapper {
	/** Обёртка; заводится на клиенте, когда впервые нужна. */
	private _node: HTMLDivElement | null = null
	/** Цель, куда обёртку положил эффект; не клал — `null`. */
	private _target: Element | null = null
	/** Узел места, куда обёртку положил его ref; снят — `null`. */
	private _place: Element | null = null

	/** Обёртка — контейнер портала. */
	get node(): HTMLDivElement {
		if (!this._node) {
			this._node = document.createElement('div')
			this._node.style.display = 'contents'
		}

		return this._node
	}

	/**
	 * Работа insertion-эффекта: обёртку — в цель. Цели нет (её нет вовсе или
	 * обёртку держит узел места) — обёртку эффект не трогает, и очистки нет.
	 */
	enter(target: Element | null): (() => void) | undefined {
		if (!target) return undefined

		target.appendChild(this.node)
		this._target = target

		return this.leave
	}

	/** Очистка insertion-эффекта: обёртку, которую он положил в цель, — вон из неё. */
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

	/** Вынуть обёртку из `parent`, если она ещё там. */
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

	// Обёртку — в цель раньше, чем React привяжет ref узлов (см. шапку)
	const into = phase === 'wrapped' ? target : null

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
