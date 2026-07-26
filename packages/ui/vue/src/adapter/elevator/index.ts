import type { TElevatorFactory } from '@soldy/setup'
import { VueElevator } from './elevator'

export { VueElevator } from './elevator'

export const vueElevatorFactory: TElevatorFactory = <T>(key: string | symbol) =>
    new VueElevator<T>(key)
