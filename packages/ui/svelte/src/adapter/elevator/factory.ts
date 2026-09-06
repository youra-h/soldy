import type { TElevatorFactory } from '@soldy/setup'
import { TSvelteElevator } from './elevator.class'

export const SvelteElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
	new TSvelteElevator<T>(key)
