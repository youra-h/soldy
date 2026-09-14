import type { IElevatorKey, TElevatorFactory } from '@soldy/setup'
import { TReactElevator } from './elevator.class'

export const ReactElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TReactElevator<T>(key.name)
