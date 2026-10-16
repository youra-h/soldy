import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TWebcElevator } from './elevator.class'

/**
 * Лифты сборки элемента: фабрика на хост. У остальных адаптеров фабрика одна
 * на пакет (`VueElevatorFactory`), а место значения лифт берёт у фреймворка —
 * компонента, чья сборка идёт сейчас. У Web Components это место — сам
 * элемент, и фабрику сборка получает на свой хост.
 */
export function createWebcElevator(host: Element): TElevatorFactory {
	return <T>(key: IElevatorKey<T>) => new TWebcElevator<T>(key.name, host)
}
