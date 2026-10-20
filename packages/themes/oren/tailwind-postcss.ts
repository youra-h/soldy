import { dirname, resolve } from 'node:path'
import { compile, optimize } from '@tailwindcss/node'
import type { Plugin } from 'postcss'
import { Polyfills } from 'tailwindcss'

/**
 * Tailwind в сборке CSS темы — шаг PostCSS вместо `@tailwindcss/postcss`.
 *
 * Шаг тот же, что у официального плагина, и на том же публичном API
 * (`@tailwindcss/node`): `compile` → `build` → `optimize`. Отличие одно — среди
 * полифилов компилятора нет `color-mix()` (`Polyfills.ColorMix`). Тот ставит к
 * каждому объявлению с `color-mix()` и `var()` запасное значение, а оригинал
 * прячет под `@supports (color: color-mix(in lab, red, red))`. Переменных темы
 * полифил не раскрывает, и запасным становится первый цвет смеси: у вуали —
 * непрозрачная ступень 500 вместо слоя в 8 %. Браузеры без `color-mix()` тема
 * не поддерживает (`AGENTS.md` темы, «Браузеры темы: с `color-mix()` и
 * `oklch()`»), и дубли давали только вес — 52 КБ из 402. Официальный плагин
 * передаёт компилятору все полифилы, и опции снять один у него нет.
 *
 * Полифил `@property` остаётся: Firefox до 128 входит в цели Vite, а
 * регистраций `@property` не знает, и начальные значения переменным — Tailwind
 * и самой темы — в нём даёт только полифил. Сторож — `__tests__/color-mix.spec.ts`.
 */

const NAME = 'soldy-theme-tailwind'

export function tailwind(): Plugin {
	return {
		postcssPlugin: NAME,
		async Once(root, { result, postcss }) {
			const from = result.opts.from

			if (!from) throw root.error('Tailwind темы: у CSS нет пути файла (`from`)')

			const compiler = await compile(root.toString(), {
				from,
				base: dirname(resolve(from)),
				// Как у официального плагина: файл, который компилятор прочтёт сам
				// (`@plugin`, `@config`, `@reference`), — зависимость сборки, и
				// `watch` пересоберёт тему по его правке. Импорты стилей — `base.css`
				// и токены — до него разворачивает Vite и отмечает сам
				onDependency: (file) => {
					result.messages.push({
						type: 'dependency',
						plugin: NAME,
						file: resolve(file),
						parent: from,
					})
				},
				// `Polyfills` в типах Tailwind — `const enum`, а в рантайме
				// `tailwindcss` отдаёт объект: значение — из него
				polyfills: Polyfills.AtProperty,
			})

			// Поиск классов выключен (`source(none)` в `src/base.css`), а
			// кандидатов из `@source inline(…)` компилятор добавляет сам
			const css = compiler.build([])
			// Как у официального плагина: оптимизация — в продакшен-сборке
			const output =
				process.env.NODE_ENV === 'production' ? optimize(css, { minify: true }).code : css

			root.removeAll()
			root.append(postcss.parse(output, result.opts).nodes)
		},
	}
}
