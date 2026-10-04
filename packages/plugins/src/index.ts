export * from './base'
export * from './custom'
// Из модуля движения наружу отдаётся только режим: как плагинам прокручивать
// при нём, решает пакет, а приложение режим только задаёт.
export { useMotion } from './motion'
export type { TMotionMode } from './motion'
// Из utils наружу отдаётся только `toCssValue`: тип-гарды узла — внутренний
// инструмент пакета, снаружи сужать узел незачем.
export { toCssValue } from './utils'
