/**
 * Codegen of the Angular surfaces: for the manifest of every component it
 * writes `generated/<name>.metadata.ts` — the input and output names and the
 * abstract directive `T<Name>Surface` the component extends. AOT needs literal
 * `inputs` and `outputs`, and the strict template — input and output members
 * with types. Both are `declare` fields: no code at runtime. The getter behind
 * an output is the base's: it defines one per name of `<Name>OutputNames` on
 * the class prototype, so a getter costs no generated code per output.
 * AGENTS.md (Angular), «Angular-специфика» and «Генератор: манифесты частей и
 * фасад».
 *
 * A component with facades has one surface for all descriptors: its own inputs
 * and outputs first, of the same name — from the first one. The type of an
 * input is by the descriptor of the component, of an output — by the
 * descriptor whose event map it is.
 *
 * Template node queries (`viewChild`) belong to the surface too, and only for
 * the refs the template of the component has: the base gets the node from
 * `templateNode`. An Angular query copies itself into every view of the
 * template, and a query without a ref is memory on every `@if` block and
 * `@for` iteration. The slot query (`contentChildren`) belongs to the surface
 * as well, and only where the component reads slots: the base gets the
 * templates from `slotTemplates`, and a content query costs every instance.
 *
 * Run: `npm run generate --workspace=@soldy-ui/angular`.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as prettier from 'prettier'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import { collectManifests } from './collect-manifests'
import { useBooleanInputs, useInputs } from '../adapter/common/useInputs'
import { useOutputs } from '../adapter/common/useOutputs'

function toPascalCase(str: string): string {
	return str.replace(/(^\w|-\w)/g, (g) => g.replace('-', '').toUpperCase())
}

/** The name the generated file imports a descriptor under. */
type TSource = 'descriptor' | 'facade' | 'ownerFacade'

type TInput = readonly [input: string, boolean: boolean]
type TOutput = readonly [output: string, event: string, source: TSource]

/** In order, without repeats: the first occurrence wins. */
function unique<T>(values: readonly T[], key: (value: T) => string): T[] {
	const seen = new Set<string>()

	return values.filter((value) => {
		const name = key(value)

		if (seen.has(name)) return false

		seen.add(name)

		return true
	})
}

/** The same layout as `npm run format` gives: otherwise CI would see drift where there is none. */
async function format(content: string, filePath: string): Promise<string> {
	const config = await prettier.resolveConfig(filePath, { editorconfig: true })

	return prettier.format(content, { ...config, filepath: filePath })
}

async function generate(): Promise<void> {
	const manifests = await collectManifests()
	const generatedDir = path.resolve(import.meta.dirname, '../generated')

	fs.mkdirSync(generatedDir, { recursive: true })

	for (const manifest of manifests) {
		const { name, folder, refs, slots } = manifest
		const facade = manifest.facade?.()
		const ownerFacade = manifest.ownerFacade?.()
		const sources: readonly (readonly [TSource, IComponentDescriptor])[] = [
			['descriptor', manifest.descriptor()],
			...(facade ? [['facade', facade] as const] : []),
			...(ownerFacade ? [['ownerFacade', ownerFacade] as const] : []),
		]
		// An input is boolean when it is boolean at the descriptor it comes from
		const inputs = unique<TInput>(
			sources.flatMap(([, descriptor]) => {
				const booleans = new Set(useBooleanInputs(descriptor))

				return useInputs(descriptor).map((input): TInput => [input, booleans.has(input)])
			}),
			([input]) => input,
		)
		const outputs = unique<TOutput>(
			sources.flatMap(([source, descriptor]) =>
				useOutputs(descriptor).map(([output, event]): TOutput => [output, event, source]),
			),
			([output]) => output,
		)
		const hasBooleans = inputs.some(([, boolean]) => boolean)
		const constName = toPascalCase(name)
		const baseParams = [
			'TInstance',
			facade ? 'DescriptorInstance<typeof facade>' : 'unknown',
			// State holds plugin inputs too: the exchange keeps an input with a
			// trigger there, as an instance property (`id` of `TIdPlugin`)
			'DescriptorPluginProps<typeof descriptor> & DescriptorPluginOutputs<typeof descriptor>',
			...(ownerFacade ? ['DescriptorInstance<typeof ownerFacade>'] : []),
		].join(', ')
		const declaredInputs = inputs.map(([input, boolean]) =>
			boolean
				? `{ name: ${JSON.stringify(input)}, transform: booleanInput }`
				: JSON.stringify(input),
		)
		const angularImports = [
			'Directive',
			...(refs.length ? ['ElementRef', 'viewChild'] : []),
			...(slots ? ['contentChildren'] : []),
		]
		const runtimeImports = [
			...(slots ? ['SlotDirective'] : []),
			'TComponentBase',
			'type TInputValue',
			'type TOutputEmitter',
			'type TRootSpec',
			'type TSetup',
			...(refs.length ? ['type TTemplateRef'] : []),
		]

		const content = [
			'// Auto-generated by @soldy-ui/angular codegen. DO NOT EDIT.',
			`import { ${angularImports.join(', ')} } from '@angular/core'`,
			`import type { IEntity } from '@soldy-ui/core'`,
			`import type { ${facade ? 'DescriptorInstance, ' : ''}DescriptorPluginOutputs, DescriptorPluginProps } from '@soldy-ui/setup'`,
			`import { ${runtimeImports.join(', ')} } from '../adapter/runtime'`,
			...(hasBooleans
				? [`import { booleanInput } from '../adapter/runtime/boolean-input'`]
				: []),
			`import type { ${sources.map(([source]) => source).join(', ')} } from '../components/${folder}/manifest'`,
			'',
			`export const ${constName}InputNames = ${JSON.stringify(inputs.map(([input]) => input))} as const`,
			`export const ${constName}OutputNames = ${JSON.stringify(outputs.map(([output]) => output))} as const`,
			'',
			`@Directive({ inputs: [${declaredInputs.join(', ')}], outputs: [...${constName}OutputNames] })`,
			`export abstract class T${constName}Surface<TInstance extends IEntity> extends TComponentBase<${baseParams}> {`,
			`constructor(setup: TSetup<${baseParams}>, spec?: TRootSpec) {`,
			`super(${constName}InputNames, ${constName}OutputNames, setup, spec)`,
			'}',
			// A signal query is a field: in a method the compiler fails AOT (NG8110).
			// `read` is set, otherwise `nativeElement` would be `any`
			...refs.map(
				(ref) =>
					`private readonly _${ref}Ref = viewChild<unknown, ElementRef<Element>>(${JSON.stringify(ref)}, { read: ElementRef })`,
			),
			...(refs.length
				? [
						'protected override templateNode(ref: TTemplateRef): Element | null {',
						...refs.map(
							(ref) =>
								`if (ref === ${JSON.stringify(ref)}) return this._${ref}Ref()?.nativeElement ?? null`,
						),
						'return null',
						'}',
					]
				: []),
			// A content query is a field as well; only where the component reads slots
			...(slots
				? [
						'private readonly _slots = contentChildren(SlotDirective)',
						'protected override slotTemplates(): readonly SlotDirective[] {',
						'return this._slots()',
						'}',
					]
				: []),
			...inputs.map(
				([input]) =>
					`declare ${input}: TInputValue<typeof descriptor, ${JSON.stringify(input)}>`,
			),
			// The type of an output for the strict template; its getter is the base's
			...outputs.map(
				([output, event, source]) =>
					`declare readonly ${output}: TOutputEmitter<typeof ${source}, ${JSON.stringify(event)}>`,
			),
			'}',
			'',
		].join('\n')

		const filePath = path.join(generatedDir, `${name}.metadata.ts`)

		fs.writeFileSync(filePath, await format(content, filePath))
	}

	console.log(`${manifests.length} files generated.`)
}

generate().catch((err) => {
	console.error(err)
	process.exit(1)
})
