import type { IElevatorKey, TElevatorFactory } from '@soldy/setup'
import { TVueElevator } from './elevator.class'

export const VueElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TVueElevator<T>(key.name)
