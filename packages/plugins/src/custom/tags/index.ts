export * from './keyboard'
export * from './scroll'
export * from './item-names'
// Из узлов тегов наружу — только узлы фокуса: остановка набора и остановка в
// теге. Их называют дескрипторы Tags и Tags.Item (`focusTarget` плагина
// действия)
export { tagStopIn, tagStopOf } from './tag'
