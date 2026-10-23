import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TWebcElevator } from './elevator.class'

/** Фабрика на хост: место значения у Web Components — сам элемент. */
export function createWebcElevator(host: Element): TElevatorFactory {
	return <T>(key: IElevatorKey<T>) => new TWebcElevator<T>(key.name, host)
}
