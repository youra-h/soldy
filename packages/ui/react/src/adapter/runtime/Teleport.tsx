/**
 * Teleport — аналог `<teleport :to>` Vue: рисует содержимое в другом месте
 * документа, в элементе по селектору цели. Так Frame уводит панель в `body`,
 * из-под `overflow` и контекстов наложения предков.
 *
 * Портал React (`createPortal`) серверный рендер не поддерживает и роняет его.
 * Поэтому на сервере и при гидратации портала нет: там React берёт серверный
 * снимок `useSyncExternalStore`, а сразу после гидратации перерисовывает
 * компонент с клиентским — и портал появляется. На клиенте без гидратации он
 * есть с первого рендера. Подписываться при этом не на что: снимок отличает
 * только сервер от клиента.
 *
 * Цель ищется при рендере; её нет — ничего не рисуется.
 *
 * `disabled` — как у Vue: содержимое рисуется на месте, без портала, и тогда
 * оно есть и на сервере.
 */

import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала */
	disabled?: boolean
	children?: ReactNode
}

export function Teleport({ to, disabled = false, children }: TTeleportProps): ReactNode {
	const client = useSyncExternalStore(subscribe, onClient, onServer)

	if (disabled) return children

	if (!client || !to) return null

	const target = document.querySelector(to)

	return target ? createPortal(children, target) : null
}
