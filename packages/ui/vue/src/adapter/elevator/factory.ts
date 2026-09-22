import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TVueElevator } from './elevator.class'

export const VueElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TVueElevator<T>(key.name)
