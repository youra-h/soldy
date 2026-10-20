export * from './active-tab'
export * from './content-warn'
export * from './item-ids'
export * from './keyboard'
export * from './layout'
export * from './item-names'
// Из узлов табов наружу — только таб-остановка: её называет дескриптор Tabs
// узлом фокуса (`focusTarget` плагина действия)
export { tabStopOf } from './tab'
