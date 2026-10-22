/**
 * Манифесты компонентов (`manifest.ts` в папках `components/`). Манифест
 * реэкспортирует фабрики дескрипторов из setup: `descriptor`, у коллекционного
 * компонента ещё `facade`, у пункта с подменю — `ownerFacade`. Реэкспортом, а
 * не `const`: выведенный тип `const` декларации пакета выписать не могут
 * (TS2883, TS7056). Имя — путь папки через дефис: `tabs/item` — `tabs-item`.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IComponentDescriptor } from '@soldy-ui/setup'

export type TManifest = {
	name: string
	/** Папка в `components/` через `/`. */
	folder: string
	descriptor: () => IComponentDescriptor
	facade?: () => IComponentDescriptor
	ownerFacade?: () => IComponentDescriptor
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

		manifests.push({
			name: folder.split('/').join('-'),
			folder,
			descriptor: mod.descriptor,
			...(typeof mod.facade === 'function' ? { facade: mod.facade } : {}),
			...(typeof mod.ownerFacade === 'function' ? { ownerFacade: mod.ownerFacade } : {}),
		})
	}

	return manifests
}
