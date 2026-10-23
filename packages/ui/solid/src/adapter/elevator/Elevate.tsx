/**
 * Elevate — отдаёт детям слой лифта компонента, аналог `provide` у Vue.
 * Пустой слой провайдера не ставит: `Provider` — эффект и мемо на узел, а
 * флажок в каждой строке таблицы своего не опускает. AGENTS.md (Solid), «Лифт».
 */

import type { JSX } from 'solid-js'
import { ElevatorContext, type TElevatorLayer } from './layer'

export type TElevateProps = {
	layer: TElevatorLayer
	children?: JSX.Element
}

export function Elevate(props: TElevateProps): JSX.Element {
	if (props.layer.empty) return props.children

	return <ElevatorContext.Provider value={props.layer}>{props.children}</ElevatorContext.Provider>
}
