import type { Plugin } from 'vite'
import { CLIENT_DIRECTIVE, hasClientDirective, isClientModule } from './client-directive.ts'
import type { TImportsOf } from './client-directive.ts'

/**
 * Opens every client module of the bundle with `'use client'` (the rule is in
 * `client-directive.ts`). The sources do not carry the directive: which module
 * needs it follows from the module graph and the text of the module — a
 * component and its assembly hook do; the entry, the helpers without React and
 * the module that hangs parts on an owner (`withParts`) do not — and the graph
 * of the build is known here, in full, with every chunk the bundle renders. A
 * directive a source writes itself the bundle keeps, and the plugin does not
 * repeat it.
 *
 * The plugin runs after the others (`enforce: 'post'`): the directive goes onto
 * the code the bundle ships.
 */
export function clientDirective(): Plugin {
	return {
		name: 'soldy:client-directive',
		enforce: 'post',
		renderChunk(code, chunk, _options, { chunks }) {
			const importsOf: TImportsOf = (module) => {
				const rendered = chunks[module]
				const imports = rendered ? [...rendered.imports, ...rendered.dynamicImports] : []

				return {
					modules: imports.filter((file) => Object.hasOwn(chunks, file)),
					packages: imports.filter((file) => !Object.hasOwn(chunks, file)),
				}
			}

			if (!isClientModule(chunk.fileName, code, importsOf) || hasClientDirective(code)) {
				return null
			}

			return `"${CLIENT_DIRECTIVE}";\n${code}`
		},
	}
}
