import ical from 'ical-generator';
import { Client } from '@notionhq/client';
import type { DatabaseObjectResponse, QueryDatabaseResponse, TextRichTextItemResponse } from '@notionhq/client/build/src/api-endpoints';
import moment from 'moment';

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

	const filtered: {
		title: string;
		date: { start: string; end: string | null; time_zone: string | null };
	}[] = databaseEntries.flatMap((dbEntry) => {
		// console.log(dbEntry)
		const dateProperty = dbEntry.properties[calendarDefinition.dateProperty];
		// console.log(dateProperty)

		switch (dateProperty.type) {
			case 'formula': {
				if (dateProperty.formula.type !== 'date') {
					return [];
				}

				const dateValue = dateProperty.formula.date;
				if (dateValue === null) {
					return [];
				}
				
				return [
					{
						title: dbEntry.properties[calendarDefinition.titleProperty].title[0].text.content,
						date: dateValue
					}
				];
			}

			case 'date':
				if (dateProperty.date === null) {
					return [];
				}

				return [
					{
						title: dbEntry.properties[calendarDefinition.titleProperty].title[0].text.content,
						date: dbEntry.properties[calendarDefinition.dateProperty].date
					}
				];						
		
			default:
				break;
		}

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
		const startDateText = event.date.start
		const startDate = moment(new Date(startDateText))
		const endDate = moment(new Date(event.date.end ?? event.date.start))
		const allDay = startDateText.search(/\d{2}T\d{2}/i) < 0
		// const timeZoneDifference = startDate.utcOffset() - endDate.utcOffset()
		
		if (allDay)
			endDate.add(1, 'days') // end date is exclusive, so add 1 day
		// else if (timeZoneDifference != 0) {
		// 	endDate.add(timeZoneDifference, 'minutes')
		// 	endDate.utcOffset(startDate.utcOffset())
		// }

		calendar.createEvent({
			start: startDate,
			end: endDate, 
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
