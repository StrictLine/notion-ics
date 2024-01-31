#!/usr/bin/env node

import { URL } from 'url';
import * as dotenv from 'dotenv';
import promptSync from 'prompt-sync';

dotenv.config();
const secret = process.env.ACCESS_KEY;
const prompt = promptSync({ sigint: true });

const publicHostUrl = process.env.PUBLIC_HOST_URL?.replace(/\/$/, '');

let link = process.argv[2];

if (!link) {
	// get user input by prompt
	const userInput = prompt('Share link: ');
	console.log(userInput);

	if (!userInput) {
		console.error('Please provide a link as an argument!');
		process.exit(1);
	}
	
	link = userInput;
}

const cleanedupLink = link.trim().replaceAll('\\', '');
console.info(`Provided link: ${cleanedupLink}\n`);

try {
	const url = new URL(cleanedupLink);
	const path = url.pathname;
	const queryStringIndex = path.lastIndexOf('/');
	const dbKey = path.substring(queryStringIndex + 1);

	console.log(`DB Key: ${dbKey}`);
	console.log(`ICS URL: ${publicHostUrl}/${dbKey}.ics?secret=${secret}`);
} catch (error) {
	console.error('Invalid link provided.');
	process.exit(1);
}
