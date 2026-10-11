/**
 * Teleport — аналог `<teleport :to>` Vue и `Teleport` React: рисует
 * содержимое в другом месте документа, в элементе по селектору цели. Так Frame
 * уводит панель в `body`, из-под `overflow` и контекстов наложения предков.
 *
 * Поверх `Portal` из `solid-js/web`, со своей целью: `Portal` без `mount`
 * ушёл бы в `body`, а здесь цели нет — нет и содержимого. Цель ищется по
 * селектору на отрисовке, а смена селектора переносит содержимое в новую цель
 * тем же узлом. Свою обёртку (`div`) `Portal` кладёт в цель и содержимое
 * рисует в ней: плагинам оверлея она не мешает — панель они находят по
 * пометке владельца (`data-owner`), слой — по `closest`, а не по родителю.
 *
 * На сервере документа нет, и содержимого в цели тоже: оно появляется на
 * клиенте, как у React и Svelte.
 *
 * `disabled` — как у Vue: содержимое рисуется на месте, без портала, и тогда
 * оно есть и на сервере.
 */

import { Show, type JSX } from 'solid-js'
import { Portal, isServer } from 'solid-js/web'

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала */
	disabled?: boolean
	children?: JSX.Element
}

/** Цель по селектору. На сервере документа нет — цели нет. */
function targetOf(selector: string | undefined): Element | null {
	if (isServer || !selector) return null

	return document.querySelector(selector)
}

export function Teleport(props: TTeleportProps): JSX.Element {
	return (
		<Show when={!props.disabled} fallback={props.children}>
			<Show when={targetOf(props.to)}>
				{(target) => <Portal mount={target()}>{props.children}</Portal>}
			</Show>
		</Show>
	)
}
