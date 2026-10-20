export * from './clipboard'
export * from './ids'
export * from './keyboard'
export * from './pointer'
export * from './touch'
// Из узлов поля наружу — только первая часть: её называет дескриптор DateInput
// узлом фокуса (`focusTarget` плагина действия)
export { firstSegmentOf } from './parts'
