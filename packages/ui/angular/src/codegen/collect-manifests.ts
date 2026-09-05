/**
 * collect-manifests — сканирует папки компонентов и собирает manifest.ts файлы.
 *
 * Каждый manifest экспортирует:
 *   - `name` — kebab-case имя (используется как имя файла и PascalCase-константы)
 *   - `descriptor` — фабрика дескриптора (без вызова)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

export type TManifest = {
	name: string
	descriptor: () => any
}

export async function collectManifests(): Promise<TManifest[]> {
	const componentsDir = path.resolve(import.meta.dirname, '../components')
	const entries = fs.readdirSync(componentsDir, { withFileTypes: true })
	const manifests: TManifest[] = []

	for (const entry of entries) {
		if (!entry.isDirectory()) continue

		const manifestPath = path.join(componentsDir, entry.name, 'manifest.ts')

		if (!fs.existsSync(manifestPath)) continue

		// tsx / ts-node / vite-node должны быть в окружении для динамического import
		const moduleUrl = pathToFileURL(manifestPath).href
		const mod = await import(moduleUrl)

		if (typeof mod.name === 'string' && typeof mod.descriptor === 'function') {
			manifests.push({ name: mod.name, descriptor: mod.descriptor })
		}
	}

	return manifests
}
