/**
 * collect-manifests — сканирует папки компонентов и собирает manifest.ts файлы.
 *
 * Каждый manifest экспортирует:
 *   - `name` — kebab-case имя (используется как имя файла и PascalCase-константы)
 *   - `descriptor` — фабрика дескриптора (без вызова), реэкспортом из setup:
 *     `export { ButtonDescriptor as descriptor } from '@soldy-ui/setup'`
 *   - `facade` — у коллекционного компонента ещё и фабрика дескриптора фасада
 *     коллекции, тем же реэкспортом:
 *     `export { ListBoxCollectionDescriptor as facade } from '@soldy-ui/setup'`.
 *     Контекстов у такого компонента два, и поверхность одна на оба
 *
 * Сгенерированный файл берёт тип фабрики из самого манифеста
 * (`typeof descriptor` в типах входов и выходов), поэтому манифест попадает в
 * декларации пакета. Реэкспорт декларации называют по имени, а у
 * `const descriptor = ButtonDescriptor` выведенный тип пришлось бы выписать
 * целиком — сборка на нём падает (TS2883, TS7056).
 *
 * Манифесты лежат и во вложенных папках: части компонента — свои компоненты
 * Angular (`tabs/item/manifest.ts` — `tabs-item`). Папку манифеста генератор
 * получает отдельно от `name`: импорт ведёт в папку, а что `name` совпадает с
 * ней, — не контракт.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { IComponentDescriptor } from '@soldy-ui/setup'

export type TManifest = {
	name: string
	/**
	 * Папка манифеста в `components/`, через `/`: `button` для
	 * `components/button/manifest.ts`, `tabs/item` — для части.
	 */
	folder: string
	descriptor: () => IComponentDescriptor
	/** Фабрика дескриптора фасада коллекции — у коллекционного компонента. */
	facade?: () => IComponentDescriptor
}

/** Папки с манифестом в `dir` и глубже, путём от `root` через `/`, по порядку обхода. */
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
		// tsx / ts-node / vite-node должны быть в окружении для динамического import
		const moduleUrl = pathToFileURL(path.join(componentsDir, folder, 'manifest.ts')).href
		const mod = await import(moduleUrl)

		if (typeof mod.name === 'string' && typeof mod.descriptor === 'function') {
			manifests.push({
				name: mod.name,
				folder,
				descriptor: mod.descriptor,
				...(typeof mod.facade === 'function' ? { facade: mod.facade } : {}),
			})
		}
	}

	return manifests
}
