export { TScrollerViewportPlugin } from './viewport.plugin'
export { resolveEdges } from './edges'
export type { TEdgesOptions, TScrollerEdges } from './edges'
export { resolveFocusShift } from './focus'
export type { TFocusShiftOptions, TInlineSpan, TScrollerViewportPluginEvents } from './types'
// Из поиска вьюпорта наружу — только правило узла фокуса: его называет
// дескриптор Scroller (`focusTarget` плагина действия)
export { viewportStopOf } from './stop'
