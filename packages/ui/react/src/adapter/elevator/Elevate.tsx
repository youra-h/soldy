/**
 * Elevate — отдаёт детям слой лифта компонента (`TAssembly.layer` из
 * `useAdapterContext`): аналог `provide` у Vue.
 *
 * Компонент-владелец коллекции оборачивает им своё содержимое: элементы,
 * смонтированные внутри, прочтут через лифт его движок и регистратор. Слой
 * меняется, только когда сменились его значения, поэтому лишних перерисовок
 * потребителей нет.
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
