import ical from 'ical-generator';
import { Client } from '@notionhq/client';
import type { TextRichTextItemResponse } from '@notionhq/client';
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

	// Define a type for the database query response
	type NotionDatabaseQueryResponse = {
		has_more: boolean;
		next_cursor: string | null | undefined;
		results: Array<Record<string, unknown>>;
	};

	const databaseEntries = [];
	let query: NotionDatabaseQueryResponse = {
		has_more: true,
		next_cursor: undefined,
		results: []
	};
	
	while (query.has_more) {
		// The Notion SDK doesn't export the query type, but we know the response shape
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore: The Notion client doesn't export proper types for database query
		query = await notion.dataSources.query({
			data_source_id: id,
			page_size: 1000,
			start_cursor: query.next_cursor,
			filter: calendarDefinition.filter
		});
		databaseEntries.push(...query.results);
	}

	const filteredDBEntries = databaseEntries.flatMap((dbEntry) => {
		const dateProperty = dbEntry.properties[calendarDefinition.dateProperty];
		const timezoneDiffProperty = calendarDefinition.timezoneDiffProperty in dbEntry.properties ?
			dbEntry.properties[calendarDefinition.timezoneDiffProperty]
			: null;

		const titlePropertyValue = dbEntry.properties[calendarDefinition.titleProperty];
		if (!titlePropertyValue.title || titlePropertyValue.title.length < 1)
			return [];

		const titleContent = titlePropertyValue.title.map(item => item.text.content).join('');
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
		
		const url = dbEntry.url

		return [
			{
				title: titleContent,
				url: url,
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

	const title = databaseMetadata.title[0] as TextRichTextItemResponse;
	const name:string = title?.text ? title.text.content : 'Untitled Calendar';
	const calendar = ical({
		name: name.trim(),
		prodId: { company: 'StrictLine e. U.', language: 'EN', product: 'notion-ics' }
	});

	const timezone = moment.tz.guess();

	filteredDBEntries.forEach((event) => {
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
			description: event.url,
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
