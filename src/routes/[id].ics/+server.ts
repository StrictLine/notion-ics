import ical from 'ical-generator';
import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse, QueryDatabaseResponse, TextRichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';

import config from '$lib/config';
import { ACCESS_KEY, NOTION_TOKEN } from '$env/static/private';
import type { RequestHandler } from './$types';

export const trailingSlash = 'never';

const notion = new Client({ auth: NOTION_TOKEN });

export const GET: RequestHandler = async ({ params, url }) => {
	const secret = url.searchParams.get('secret');
	if (secret !== ACCESS_KEY) {
		return new Response('Forbidden', { status: 403 });
	}

	const { id } = params;

	const calendarDefinition = id in config ? config[id] : config.default;

	const databaseMetadata = await notion.databases.retrieve({ database_id: id });

	const databaseEntries = [];
	let query: QueryDatabaseResponse | { has_more: true; next_cursor: undefined } = {
		has_more: true,
		next_cursor: undefined
	};
	while (query.has_more) {
		query = await notion.databases.query({
			database_id: id,
			page_size: 100,
			start_cursor: query.next_cursor,
			filter: calendarDefinition.filter
		});
		databaseEntries.push(...query.results);
	}

	const filtered: {
		title: string;
		date: { start: string; end: string | null; time_zone: string | null };
	}[] = databaseEntries.flatMap((object) => {
		if (object.properties[calendarDefinition.dateProperty].date === null) {
			return [];
		}
		return [
			{
				title: object.properties[calendarDefinition.titleProperty].title[0].text.content,
				date: object.properties[calendarDefinition.dateProperty].date
			}
		];
	});

	if (!('title' in databaseMetadata))
		return new Response('Partial response has been received from notion', {
			status: 404,
			headers: {
				'content-type': 'text/plain'
			}
		});

	const calendar = ical({
		name: ((databaseMetadata as DatabaseObjectResponse).title[0] as TextRichTextItemResponse).text.content,
		prodId: { company: 'StrictLine e. U.', language: 'EN', product: 'notion-ics' }
	});
	filtered.forEach((event) => {
		calendar.createEvent({
			start: new Date(event.date.start),
			end: new Date(Date.parse(event.date.end ?? event.date.start) + 86400000), // end date is exclusive, so add 1 day
			allDay: true,
			summary: event.title,
			busystatus: calendarDefinition.busy
		});
	});

	return new Response(calendar.toString(), {
		status: 200,
		headers: {
			'content-type': 'text/calendar'
		}
	});
};
