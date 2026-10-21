/**
 * useElevator — лифт сборки компонента: фабрика лифтов для его расширений и
 * слой, который он отдаёт детям.
 *
 * Зовёт его setup-функция владельца коллекции или её элемента — один раз, при
 * выполнении тела компонента: оно выполняется один раз, и контекст Solid
 * читается только тогда. Слой предка читается здесь же (`useContext`), а не в
 * лифте: лифт зовут расширения сборки, и контекст — механизм адаптерного слоя,
 * а не их. Тем же путём API тостов берёт `useToasts()` (`adapter/toasts/`) —
 * в теле компонента под менеджером, `up()` лифта: опускать ему нечего, а
 * контекст лифта за адаптерный слой не выходит.
 *
 * - `elevator` — фабрика лифтов этой сборки (`TSolidElevator`): `up()` читает
 *   слой предка, `down()` пишет в слой компонента;
 * - `layer` — слой компонента, свой поверх слоя предка. Детям его отдаёт
 *   `Elevate`: владелец коллекции оборачивает им своё содержимое. Элементу
 *   опускать нечего, и слой ему не нужен.
 *
 * Слежения за устаревшим слоем, как у React, нет: компонент Solid собирается
 * один раз, и слой предка у него один на всю жизнь.
 */

import { useContext } from 'solid-js'
import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSolidElevator } from './elevator.class'
import { ElevatorContext, TElevatorLayer } from './layer'

/** Лифт сборки: фабрика лифтов и слой компонента. */
export type TElevation = {
	/** Лифты этой сборки: `up()` — слой предка, `down()` — свой слой. */
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
