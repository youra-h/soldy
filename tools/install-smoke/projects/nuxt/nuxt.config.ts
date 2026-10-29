// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: false },
	css: ['@soldy-ui/theme-oren'],
	app: { head: { title: 'Soldy UI — Nuxt', htmlAttrs: { lang: 'en' } } },
})
