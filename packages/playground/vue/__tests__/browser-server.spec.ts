// @vitest-environment node

/**
 * The Playwright server in Docker that runs WebKit for `npm run
 * test:layout:webkit` (`browser-server/`). Its protocol must be the one the
 * run speaks, so the image follows the installed `playwright-core`, and that
 * must be the version package-lock pins — the one CI runs.
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dockerRunArgs, serverImage, type TLock } from '../browser-server/server.ts'

const ROOT = path.resolve(import.meta.dirname, '..')

/** A lock that pins `playwright-core` of the given version. */
const lockOf = (version: string): TLock => ({
	packages: { 'node_modules/playwright-core': { version } },
})

describe('образ сервера', () => {
	it('— тот, что Playwright выпускает для установленной версии', () => {
		expect(serverImage(lockOf('1.64.1'), '1.64.1')).toBe(
			'mcr.microsoft.com/playwright:v1.64.1-noble',
		)
	})

	it('установлена не та версия, что в package-lock, — прогон стоп, просит npm install', () => {
		expect(() => serverImage(lockOf('1.64.1'), '1.63.0')).toThrow(
			/1\.63\.0.*1\.64\.1.*npm install/,
		)
	})

	it('в репозитории установлен playwright-core версии из package-lock, playwright — той же', () => {
		const lock: TLock = JSON.parse(
			readFileSync(path.resolve(ROOT, '../../../package-lock.json'), 'utf8'),
		)
		const core = createRequire(import.meta.url).resolve('playwright-core/package.json')
		const installed: string = JSON.parse(readFileSync(core, 'utf8')).version

		expect(serverImage(lock, installed)).toBe(
			`mcr.microsoft.com/playwright:v${installed}-noble`,
		)
		expect(lock.packages['node_modules/playwright']?.version).toBe(installed)
	})
})

describe('запуск контейнера', () => {
	const IMAGE = 'mcr.microsoft.com/playwright:v1.64.1-noble'
	const args = dockerRunArgs({
		image: IMAGE,
		core: '/repo/node_modules/playwright-core',
		tools: '/repo/packages/playground/vue/browser-server',
		port: 41000,
		api: 41001,
	})

	it('сервер Playwright отвечает только на петле этой машины', () => {
		expect(args).toContain('127.0.0.1:41000:3000')
		expect(args.filter((arg) => arg === '--publish')).toHaveLength(1)
	})

	it('сервер — установленный playwright-core, подключённый только на чтение', () => {
		expect(args).toContain(
			'type=bind,source=/repo/node_modules/playwright-core,target=/playwright-core,readonly',
		)
		expect(args.at(-1)).toContain(
			'exec node /playwright-core/cli.js run-server --port 3000 --host 0.0.0.0',
		)
	})

	it('рядом с сервером — прокси на порт Vitest этой машины', () => {
		expect(args).toContain(
			'type=bind,source=/repo/packages/playground/vue/browser-server,target=/browser-server,readonly',
		)
		expect(args.slice(args.indexOf(IMAGE) + 1, -1)).toEqual(['sh', '-c'])
		expect(args.at(-1)).toMatch(/^node \/browser-server\/proxy\.ts 41001 & exec /)
	})

	it('остановленный контейнер удаляется', () => {
		expect(args.slice(0, 3)).toEqual(['run', '-d', '--rm'])
	})
})
