import type { Snippet } from 'svelte'
import type { HTMLAttributes, HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements'
import type { IEntity } from '@soldy-ui/core'
import type {
	IComponentDescriptor,
	DescriptorAllProps,
	DescriptorCallbackEvents,
	DescriptorComponentProps,
	DescriptorSlots,
	DEFAULT_SLOT,
	TContractOf,
} from '@soldy-ui/setup'

/** Событийные пропы компонента из дескриптора (core + плагины). */
export type EventProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	DescriptorCallbackEvents<TDescriptorFn>

/**
 * Слоты — snippet-пропы; `default` — `children`. Сниппет без параметров
 * присваивается `Snippet<[S]>`, поэтому слот со scope принимает и его.
 */
export type TSnippetSlots<TSlots extends object> = {
	[K in keyof TSlots as K extends typeof DEFAULT_SLOT ? 'children' : K]?: TSlots[K] extends object
		? keyof TSlots[K] extends never
			? Snippet
			: Snippet<[TSlots[K]]>
		: Snippet
}

/** Слоты компонента из дескриптора. */
export type SlotProps<TDescriptorFn extends (...args: any[]) => IComponentDescriptor> =
	TSnippetSlots<DescriptorSlots<TDescriptorFn>>

/** Props headless-слоя: core props + события + слоты. */
export type UseProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
> = DescriptorComponentProps<TDescriptorFn, TInstance> & TEvents & SlotProps<TDescriptorFn>

/**
 * HTML-атрибуты без того, что съедает связка: входов, защищённых пропсов,
 * слотов и событий дескриптора (`TEvents` — у коллекции и фасада), — как
 * `TDomAttributes` у React. `children` вычитается всегда: содержимое — только
 * слот `default`. AGENTS.md (Svelte), «Типы пропсов».
 */
export type TDomAttributes<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = Omit<
	TAttributes,
	| 'children'
	| keyof DescriptorAllProps<TDescriptorFn>
	| TContractOf<TDescriptorFn>['protectedName']
	| keyof SlotProps<TDescriptorFn>
	| keyof TEvents
>

/** Атрибуты `<input>` полей без того, что поле ведёт из ядра само. */
export type TFieldAttributes = Omit<
	HTMLInputAttributes,
	| 'checked'
	| 'indeterminate'
	| 'defaultChecked'
	| 'defaultchecked'
	| 'defaultValue'
	| 'defaultvalue'
	| 'readonly'
>

/** Атрибуты `<textarea>` без того, что поле ведёт из ядра само. */
export type TTextareaAttributes = Omit<
	HTMLTextareaAttributes,
	'defaultValue' | 'defaultvalue' | 'readonly' | 'maxlength'
>

/**
 * Корень компонента — связываемый проп `ref` (`bind:ref`): `bind:this` даёт
 * экземпляр, а не узел. У поля тоже корень. До монтирования и на сервере не
 * пишется.
 */
export type TRootRefProps = {
	ref?: Element | null
}

/**
 * Props DOM-компонента: UseProps, атрибуты (`TAttributes` — корня, у полей
 * `TFieldAttributes`, у Button — кнопки) и `ref`.
 */
export type UseDomProps<
	TDescriptorFn extends (...args: any[]) => IComponentDescriptor,
	TInstance extends IEntity = IEntity,
	TEvents extends object = EventProps<TDescriptorFn>,
	TAttributes extends object = HTMLAttributes<HTMLElement>,
> = UseProps<TDescriptorFn, TInstance, TEvents> &
	TDomAttributes<TDescriptorFn, TEvents, TAttributes> &
	TRootRefProps
