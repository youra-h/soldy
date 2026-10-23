import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSvelteElevator } from './elevator.class'

/**
 * Фабрика лифтов сборки — одна на сборку, при инициализации компонента: у
 * второй фабрики `up()` не знал бы опущенного первой.
 */
export function useElevator(): TElevatorFactory {
	const inherited = new Map<symbol, unknown>()

	return <T>(key: IElevatorKey<T>) => new TSvelteElevator<T>(key.name, inherited)
}
