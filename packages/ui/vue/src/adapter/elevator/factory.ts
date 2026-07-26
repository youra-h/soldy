import type { TElevatorFactory } from '@soldy/setup'
import { TVueElevator } from './elevator.class'

export const VueElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
	new TVueElevator<T>(key)
