import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSolidElevator } from './elevator.class'

export const SolidElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TSolidElevator<T>(key.name)
