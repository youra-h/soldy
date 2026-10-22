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
 * оно есть и на сервере. Смена `disabled`, как и смена цели, переносит те же
 * узлы, а не рисует их заново: поле в панели сохраняет набранное. Геттер
 * `children` в пропсах Solid на каждое чтение создаёт узлы заново, поэтому
 * содержимое разворачивается один раз — мемо `children()` под владельцем
 * Teleport, — и обе ветки, место и `Portal`, читают его. Снятая ветка уносит
 * только себя (`Portal` — и свою обёртку из цели), а узлы содержимого живут,
 * пока жив Teleport: цель, пропавшая на лету, вынимает их из документа, а
 * вернувшаяся получает те же.
 *
 * Мемо заводит первое чтение, а не сборка Teleport, — как своё заводит
 * `Portal`, в эффекте. Заведённое сразу собирало бы содержимое там, где его
 * нет: без цели — впустую, а при гидратации в ветке портала — по разметке,
 * которой сервер не рисовал. Ветка на месте читает его там же, где читала
 * геттер, и разметка сервера и гидратация с `disabled` прежние. Владелец мемо —
 * тот, под которым стоит Teleport, а не ветка, прочитавшая первой: смена ветки
 * мемо не снимает, а контексты места (локаль поддерева) у содержимого те же в
 * обеих ветках.
 *
 * Ветки здесь — `Show` Solid, а не адаптера (`flow.ts`): условие у них — цель
 * и `disabled`, а не вход элементов, и содержимое портала Solid рисует после
 * окна гидратации сам.
 */

import { Show, children, getOwner, runWithOwner, type ChildrenReturn, type JSX } from 'solid-js'
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
	const owner = getOwner()
	let resolved: ChildrenReturn | undefined

	// Содержимое, одно на обе ветки: мемо — с первым чтением, под владельцем
	// Teleport. Без мемо `runWithOwner` возвращается, только когда сборка
	// содержимого бросила и ошибку взяла граница ошибок
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
