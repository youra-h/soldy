/**
 * Лифт сборки: фабрика лифтов для расширений и слой компонента, который детям
 * отдаёт `Elevate`. Зовётся в теле компонента — контекст Solid читается только
 * тогда. AGENTS.md (Solid), «Лифт».
 */

import { useContext } from 'solid-js'
import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSolidElevator } from './elevator.class'
import { ElevatorContext, TElevatorLayer } from './layer'

export type TElevation = {
	readonly elevator: TElevatorFactory
	/** Слой компонента: свой поверх слоя предка. Детям — через `Elevate`. */
	readonly layer: TElevatorLayer
}

export function useElevator(): TElevation {
	const parent = useContext(ElevatorContext)
	const layer = new TElevatorLayer(parent)

	return {
		elevator: <T>(key: IElevatorKey<T>) => new TSolidElevator<T>(key.name, parent, layer),
		layer,
	}
}
