export {
	useAdapter,
	useCollectionAdapter,
	joinBindings,
	type TBinding,
	type TCollectionBinding,
	type TRootReceiver,
} from './useAdapter.svelte'
export { default as Dynamic } from './Dynamic.svelte'
export { default as Teleport } from './Teleport.svelte'
export { default as TextSpan } from './TextSpan.svelte'
export { isTagComponent, type TTagComponent } from './tag'
export { runsOf, type TRun } from './runs'
export { fieldText, textareaText, type TFieldText, type TTextareaText } from './field-text'
export type { TTeleportProps } from './types'
