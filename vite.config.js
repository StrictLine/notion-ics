import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['moment']
	},
	preview: {
		allowedHosts: ['apps.strictline.at']
	}
};

export default config;
