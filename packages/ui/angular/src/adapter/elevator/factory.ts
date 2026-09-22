import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TAngularElevator } from './elevator.class'

export const AngularElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TAngularElevator<T>(key.name)
