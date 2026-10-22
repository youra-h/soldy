export { useAdapter, useCollectionAdapter, joinBindings } from './useAdapter'
export type {
	TBinding,
	TBindingState,
	TCollectionBinding,
	TInputValue,
	TOutputEmitter,
	TOutputOf,
} from './useAdapter'
export { TComponentBase, type TSetup } from './component.base'
export type { TRootSet, TRootSpec, TRootTeleport } from './root/spec'
// Host-директива базы: компилятор требует видеть её из точки входа (NG3001)
export { SubtreeDirective as ɵSubtreeDirective } from './subtree.directive'
export { SlotDirective } from './slot.directive'
export { AttributesDirective } from './attributes.directive'
export { FieldTextDirective } from './field-text.directive'
export { TextPipe } from './text.pipe'
