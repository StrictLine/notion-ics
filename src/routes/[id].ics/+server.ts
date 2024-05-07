import ical from 'ical-generator';
import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse, QueryDatabaseResponse, TextRichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import moment from 'moment-timezone';

import config from '$lib/config';
import type { RequestHandler } from './$types';

const { ACCESS_KEY, NOTION_TOKEN } = process.env;
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

	const filtered = databaseEntries.flatMap((dbEntry) => {
		const dateProperty = dbEntry.properties[calendarDefinition.dateProperty];
		const timezoneDiffProperty = calendarDefinition.timezoneDiffProperty in dbEntry.properties ?
			dbEntry.properties[calendarDefinition.timezoneDiffProperty]
			: null;

		const titleContent = dbEntry.properties[calendarDefinition.titleProperty].title[0].text.content;
		let dateValue = null;
		
		switch (dateProperty.type) {
			case 'formula':
				if (dateProperty.formula.type !== 'date') {
					return [];
				}

				dateValue = dateProperty.formula.date;
			break;

			case 'date':
				dateValue = dateProperty.date
			break;

			default:
				break;
		}

		if (dateValue === null)
			return [];
		
		return [
			{
				title: titleContent,
				date: dateValue,
				timezoneDiff: timezoneDiffProperty?.formula.number ?? 0
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

	const timezone = moment.tz.guess();

	filtered.forEach((event) => {
		const startDateText = event.date.start
		const startDate = moment(new Date(startDateText))
		const endDate = moment(new Date(event.date.end ?? event.date.start))
			.subtract(event.timezoneDiff, 'hour')

		const allDay = startDateText.search(/\d{2}T\d{2}/i) < 0
		
		if (allDay)
			endDate.add(1, 'days') // end date is exclusive, so add 1 day

		calendar.createEvent({
			start: startDate,
			end: endDate, 
			timezone: timezone,
			allDay: allDay,
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
