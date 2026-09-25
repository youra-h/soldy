/**
 * collect-manifests — сканирует папки компонентов и собирает manifest.ts файлы.
 *
 * Каждый manifest экспортирует:
 *   - `name` — kebab-case имя (используется как имя файла и PascalCase-константы)
 *   - `descriptor` — фабрика дескриптора (без вызова), реэкспортом из setup:
 *     `export { ButtonDescriptor as descriptor } from '@soldy-ui/setup'`
 *
 * Сгенерированный файл берёт тип фабрики из самого манифеста
 * (`typeof descriptor` в типах выходов), поэтому манифест попадает в
 * декларации пакета. Реэкспорт декларации называют по имени, а у
 * `const descriptor = ButtonDescriptor` выведенный тип пришлось бы выписать
 * целиком — сборка на нём падает (TS2883, TS7056).
 *
 * Папку манифеста генератор получает отдельно от `name`: импорт ведёт в
 * папку, а что `name` совпадает с ней, — не контракт.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IComponentDescriptor } from '@soldy-ui/setup'

export type TManifest = {
	name: string
	/** Папка манифеста в `components/`: `button` для `components/button/manifest.ts`. */
	folder: string
	descriptor: () => IComponentDescriptor
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
			manifests.push({ name: mod.name, folder: entry.name, descriptor: mod.descriptor })
		}
	}

	return manifests
}
