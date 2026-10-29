import { provideBrowserGlobalErrorListeners } from '@angular/core'
import type { ApplicationConfig } from '@angular/core'
import { provideClientHydration } from '@angular/platform-browser'
import { provideAttrs } from '@soldy-ui/angular'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'

// The registries are global: filled once in the browser and once on the
// server, which takes this config too — not once per request
useIcons(material)
useTheme(oren)

export const appConfig: ApplicationConfig = {
	providers: [provideBrowserGlobalErrorListeners(), provideClientHydration(), provideAttrs()],
}
