/**
 * Teleport — аналог `<teleport :to>` Vue поверх `Portal`: цели нет — нет и
 * содержимого, `disabled` рисует на месте. Смена цели или `disabled` переносит
 * те же узлы. AGENTS.md (Solid), «Teleport».
 */

import { Show, children, getOwner, runWithOwner, type ChildrenReturn, type JSX } from 'solid-js'
import { Portal, isServer } from 'solid-js/web'

export type TTeleportProps = {
	/** Селектор цели: `body`, `#layers`. */
	to: string | undefined
	/** Рисовать на месте, без портала. */
	disabled?: boolean
	children?: JSX.Element
}

function targetOf(selector: string | undefined): Element | null {
	if (isServer || !selector) return null

	return document.querySelector(selector)
}

export function Teleport(props: TTeleportProps): JSX.Element {
	const owner = getOwner()
	let resolved: ChildrenReturn | undefined

	// Содержимое одно на обе ветки: мемо — с первым чтением, под владельцем
	// Teleport. Без мемо `runWithOwner` возвращается, только когда сборка
	// бросила и ошибку взяла граница ошибок
	const content = (): JSX.Element => {
		resolved ??= runWithOwner(owner, () => children(() => props.children))

		return resolved?.()
	}

	return (
		<Show when={!props.disabled} fallback={content()}>
			<Show when={targetOf(props.to)}>
				{(target) => <Portal mount={target()}>{content()}</Portal>}
			</Show>
		</Show>
	)
}
