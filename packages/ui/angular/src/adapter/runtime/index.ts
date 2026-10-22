export { useAdapter, useCollectionAdapter, joinBindings } from './useAdapter'
export type {
	TBinding,
	TBindingState,
	TCollectionBinding,
	TInputValue,
	TOutputEmitter,
	TOutputOf,
} from './useAdapter'
export { TComponentBase } from './component.base'
export type { TRootSet, TRootSpec, TRootTeleport } from './component.base'
// Закрытое имя, как закрытое API Angular: носитель — host-директива базы, и
// компилятор библиотеки требует видеть его из точки входа (NG3001)
export { SubtreeDirective as ɵSubtreeDirective } from './subtree.directive'
export { SlotDirective } from './slot.directive'
export { AttributesDirective } from './attributes.directive'
export { FieldTextDirective } from './field-text.directive'
export { TextPipe } from './text.pipe'
