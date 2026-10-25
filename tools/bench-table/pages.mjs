/**
 * Страницы участников — общее для прогонщика, трассы и снимка кучи: адрес
 * страницы участника и типы файлов её сборки.
 *
 * Флаги — через «+»: `soldy+virtual` — `?lib=soldy&virtual=1`,
 * `soldy+mode=none+cols=5` — `?lib=soldy&mode=none&cols=5`. Участник не на Vue —
 * с префиксом своей страницы: `react:soldy+fit=none` — `react.html?lib=soldy&fit=none`,
 * так же `angular:`, `svelte:`, `solid:` и `webc:`.
 */
const PAGES = ['react', 'angular', 'svelte', 'solid', 'webc']

export function urlOf(lib) {
	const page = PAGES.find((name) => lib.startsWith(name + ':'))
	const [name, ...flags] = (page ? lib.slice(page.length + 1) : lib).split('+')

	return (
		(page ? page + '.html' : '') +
		'?lib=' +
		name +
		flags.map((flag) => `&${flag.includes('=') ? flag : flag + '=1'}`).join('')
	)
}

/**
 * Типы файлов сборки для сервера страниц: темы библиотек грузят ещё шрифты,
 * картинки и JSON (Carbon, UI5, Vaadin).
 */
export const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
}
