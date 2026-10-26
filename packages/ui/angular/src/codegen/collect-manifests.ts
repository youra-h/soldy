/**
 * Component manifests (`manifest.ts` in the folders of `components/`). A
 * manifest re-exports descriptor factories from setup: `descriptor`, a
 * collection component also `facade`, an item with a submenu — `ownerFacade`.
 * By a re-export, not a `const`: the package declarations cannot spell out the
 * inferred type of a `const` (TS2883, TS7056). The name is the folder path
 * through a hyphen: `tabs/item` — `tabs-item`.
 *
 * The template refs the base needs (`#root`, `#control`, `#companion`) come
 * from the template of the component: `*.component.html` of its folder,
 * without HTML comments. Whether the component reads slots (`slot()`) — from
 * its template and its class, `*.component.ts`, without comments.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import type { TTemplateRef } from '../adapter/runtime/component.base'

export type TManifest = {
	name: string
	/** Папка в `components/` через `/`. */
	folder: string
	descriptor: () => IComponentDescriptor
	facade?: () => IComponentDescriptor
	ownerFacade?: () => IComponentDescriptor
	/** Ссылки шаблона компонента, которые читает база, — в порядке `TEMPLATE_REFS`. */
	refs: readonly TTemplateRef[]
	/** The component reads slot templates (`slot()`): its surface queries them. */
	slots: boolean
}

const TEMPLATE_REFS: readonly TTemplateRef[] = ['root', 'control', 'companion']

/** Template of the component without HTML comments: a ref or a call in a comment is none. */
function templateMarkup(folder: string): string {
	return fs
		.readdirSync(folder)
		.filter((file) => file.endsWith('.component.html'))
		.map((file) =>
			fs.readFileSync(path.join(folder, file), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
		)
		.join('\n')
}

/** Class of the component without comments. */
function classSource(folder: string): string {
	return fs
		.readdirSync(folder)
		.filter((file) => file.endsWith('.component.ts'))
		.map((file) =>
			fs
				.readFileSync(path.join(folder, file), 'utf8')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/\/\/.*$/gm, ''),
		)
		.join('\n')
}

/** Refs `#name` on the elements of the template. */
function templateRefs(markup: string): TTemplateRef[] {
	const names = new Set<string>()

	for (const [, name] of markup.matchAll(/\s#([\w-]+)/g)) names.add(name)

	return TEMPLATE_REFS.filter((ref) => names.has(ref))
}

/** The template or the class calls `slot()` of the base. */
function readsSlots(markup: string, source: string): boolean {
	const call = /\bslot\(/

	return call.test(markup) || call.test(source)
}

function manifestFolders(root: string, dir: string = root): string[] {
	const folders: string[] = []

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue

		const full = path.join(dir, entry.name)

		if (fs.existsSync(path.join(full, 'manifest.ts'))) {
			folders.push(path.relative(root, full).split(path.sep).join('/'))
		}

		folders.push(...manifestFolders(root, full))
	}

	return folders
}

export async function collectManifests(): Promise<TManifest[]> {
	const componentsDir = path.resolve(import.meta.dirname, '../components')
	const manifests: TManifest[] = []

	for (const folder of manifestFolders(componentsDir)) {
		const mod = await import(
			pathToFileURL(path.join(componentsDir, folder, 'manifest.ts')).href
		)

		if (typeof mod.descriptor !== 'function') continue

		const markup = templateMarkup(path.join(componentsDir, folder))

		manifests.push({
			name: folder.split('/').join('-'),
			folder,
			descriptor: mod.descriptor,
			...(typeof mod.facade === 'function' ? { facade: mod.facade } : {}),
			...(typeof mod.ownerFacade === 'function' ? { ownerFacade: mod.ownerFacade } : {}),
			refs: templateRefs(markup),
			slots: readsSlots(markup, classSource(path.join(componentsDir, folder))),
		})
	}

	return manifests
}
