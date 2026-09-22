import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TSvelteElevator } from './elevator.class'

export const SvelteElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TSvelteElevator<T>(key.name)
