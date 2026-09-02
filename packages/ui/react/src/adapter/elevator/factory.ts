import type { TElevatorFactory } from '@soldy/setup'
import { TReactElevator } from './elevator.class'

export const ReactElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
	new TReactElevator<T>(key)
