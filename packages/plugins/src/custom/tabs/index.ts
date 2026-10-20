export * from './active-tab'
export * from './content-warn'
export * from './item-ids'
export * from './keyboard'
export * from './layout'
export * from './item-names'
// Из узлов табов наружу — только узлы фокуса: таб-остановка набора и узел таба
// в элементе. Их называют дескрипторы Tabs и Tabs.Item (`focusTarget` плагина
// действия)
export { tabIn, tabStopOf } from './tab'
