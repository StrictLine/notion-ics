import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-node';
import * as dotenv from 'dotenv';

dotenv.config();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),

	kit: {
		adapter: adapter(),
		paths: {
			base: process.env.BASE_PATH,
			relative: false
		}
	}
};

export default config;
