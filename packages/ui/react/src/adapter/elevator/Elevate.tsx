/**
 * Elevate — отдаёт детям слой лифта компонента (`TAssembly.layer` из
 * `useAdapterContext`): аналог `provide` у Vue.
 *
 * Компонент-владелец коллекции оборачивает им своё содержимое: элементы,
 * смонтированные внутри, прочтут через лифт его движок и регистратор. Слой
 * меняется, только когда сменились его значения, поэтому лишних перерисовок
 * потребителей нет.
 *
 * Контрол поля формы (Input, CheckBox, Switch) слой отдаёт только содержимому
 * своих слотов (`elevated`): своему поддереву он опускает пустую связку поля,
 * а кроме слотов, контролов в его поддереве нет. Без слотов обёртки нет вовсе
 * — флажок в каждой строке таблицы лишних узлов дерева не несёт.
 */

import type { ReactNode } from 'react'
import { ElevatorContext, type TElevatorLayer } from './layer'

export type TElevateProps = {
	/** Слой компонента: родительский плюс то, что его сборка опустила. */
	layer: TElevatorLayer
	children?: ReactNode
}

export function Elevate({ layer, children }: TElevateProps): ReactNode {
	return <ElevatorContext value={layer}>{children}</ElevatorContext>
}

/**
 * Содержимое слота под слоем лифта компонента; пустой слот (`undefined` от
 * `renderSlot`) — как есть, и запасное содержимое компонента встаёт на его
 * место (`elevated(layer, renderSlot(…)) ?? своё`).
 */
export function elevated(layer: TElevatorLayer, content: ReactNode): ReactNode {
	return content === undefined ? undefined : <Elevate layer={layer}>{content}</Elevate>
}
