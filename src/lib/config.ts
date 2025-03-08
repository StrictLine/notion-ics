import { ICalEventBusyStatus } from 'ical-generator';
import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

type CalendarQueryDefinition = {
	filter: Readonly<QueryDatabaseParameters['filter']>;
	dateProperty: Readonly<string>;
	titleProperty: Readonly<string>;
	busy: Readonly<ICalEventBusyStatus>;
	timezoneDiffProperty?: Readonly<string>;
};

export default {
	"default": {
		filter: {
			and: [
				// { property: 'Type', select: { does_not_equal: 'Task' } }
			]
		},
		dateProperty: 'Time Frame',
		titleProperty: 'Item',
		busy: ICalEventBusyStatus.BUSY
	},
	"db-id-comes-here": {
		filter: {
			and: [
				// { property: 'Type', select: { does_not_equal: 'Task' } }
			]
		},
		dateProperty: 'Time Frame',
		titleProperty: 'Item',
		busy: ICalEventBusyStatus.BUSY
	}

} as Record<string, CalendarQueryDefinition>;