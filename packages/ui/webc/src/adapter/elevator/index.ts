// Лифт — механика сборки элементов коллекций адаптера, а не API: наружу пакета
// он не выходит, и в бочку адаптера (`adapter/index.ts`) его нет
export { TWebcElevator } from './elevator.class'
export { createWebcElevator } from './factory'
