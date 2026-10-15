import type { IElevatorKey, TElevatorFactory } from '@soldy-ui/setup'
import { TAngularElevator } from './elevator.class'

/** Лифты сборки Angular: работают со слоем DI в контексте инъекции компонента. */
export const AngularElevatorFactory: TElevatorFactory = <T>(key: IElevatorKey<T>) =>
	new TAngularElevator<T>(key.name)
