/**
 * Elevate — отдаёт детям слой лифта компонента (`useElevator`): аналог
 * `provide` у Vue и `Elevate` у React.
 *
 * Владелец коллекции оборачивает им своё содержимое: элементы, смонтированные
 * внутри, прочтут через лифт его движок и регистратор. Значение контекста
 * Solid отдаёт детям только `Provider`, и только тем, чьи узлы создаются под
 * ним. Поэтому слот, по которому разметка владельца что-то решает, она
 * разворачивает внутри `Elevate` (`ResolvedSlot`): развёрнутый в теле
 * владельца, он собрал бы элементы вне его слоя, и движка они не увидели бы.
 *
 * Слой у компонента один на всю жизнь, и значения в нём пишет сборка, пока
 * детей ещё нет: менять значение контекста не приходится.
 */

import type { JSX } from 'solid-js'
import { ElevatorContext, type TElevatorLayer } from './layer'

export type TElevateProps = {
	/** Слой компонента: свой поверх слоя предка (`useElevator`). */
	layer: TElevatorLayer
	children?: JSX.Element
}

export function Elevate(props: TElevateProps): JSX.Element {
	return <ElevatorContext.Provider value={props.layer}>{props.children}</ElevatorContext.Provider>
}
