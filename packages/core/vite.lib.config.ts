// Расширение обязательно: с ним конфиг читает и нативный загрузчик Vite
import { libConfig } from '../../tools/vite/lib.config.ts'

/**
 * Библиотечная сборка @soldy-ui/core: headless-модели без зависимостей.
 * Декларации собирает `tsc -p tsconfig.build.json` вторым шагом скрипта `build`.
 */
export default libConfig({
	name: '@soldy-ui/core',
	root: import.meta.dirname,
	entry: 'src/index.ts',
})
