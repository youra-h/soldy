import type { TElevatorFactory } from '@soldy/setup'
import { TSolidElevator } from './elevator.class'

export const SolidElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
	new TSolidElevator<T>(key)
