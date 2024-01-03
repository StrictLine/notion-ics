#!/usr/bin/env node

import { URL } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();
const secret = process.env.ACCESS_KEY;
const publicHostUrl = process.env.PUBLIC_HOST_URL?.replace(/\/$/, '');

const link = process.argv[2];

if (!link) {
	console.error('Please provide a link as an argument.');
	process.exit(1);
}

const cleanedupLink = link.trim().replaceAll('\\', '');
console.info(`Provided link: ${cleanedupLink}\n`);

try {
	const url = new URL(cleanedupLink);
	const path = url.pathname;
	const queryStringIndex = path.lastIndexOf('/');
	const dbKey = path.substring(queryStringIndex + 1);

	console.log(`DB Key: ${dbKey}`);
	console.log(`ICS URL: ${publicHostUrl}/${dbKey}?secret=${secret}`);
} catch (error) {
	console.error('Invalid link provided.');
	process.exit(1);
}
