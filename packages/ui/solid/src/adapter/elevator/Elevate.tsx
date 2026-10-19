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
 *
 * Своего в слое нет (`empty`) — провайдера нет: дети прочтут из слоя предка
 * то же самое, а `Provider` — это эффект и мемо на каждый узел. Так обходится
 * без них контрол поля формы вне поля (Input, CheckBox, Switch): пустую связку
 * поля он опускает своему содержимому, только когда поле над ним есть, и
 * флажок в каждой строке таблицы провайдера не несёт.
 */

import type { JSX } from 'solid-js'
import { ElevatorContext, type TElevatorLayer } from './layer'

export type TElevateProps = {
	/** Слой компонента: свой поверх слоя предка (`useElevator`). */
	layer: TElevatorLayer
	children?: JSX.Element
}

export function Elevate(props: TElevateProps): JSX.Element {
	if (props.layer.empty) return props.children

	return <ElevatorContext.Provider value={props.layer}>{props.children}</ElevatorContext.Provider>
}
