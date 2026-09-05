import type { TElevatorFactory } from '@soldy/setup'
import { TAngularElevator } from './elevator.class'

export const AngularElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
	new TAngularElevator<T>(key)
