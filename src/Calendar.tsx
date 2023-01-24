import { Button, TextField } from '@mui/material';
import type { ExternalEventTypes } from '@toast-ui/calendar';
import { TZDate } from '@toast-ui/calendar';
import '@toast-ui/calendar/toastui-calendar.css';
import ToastCalendar from '@toast-ui/react-calendar';
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import 'tui-calendar/dist/tui-calendar.css';
import 'tui-color-picker/dist/tui-color-picker.css';
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';

type ViewType = 'month' | 'week' | 'day';

const viewModeOptions = [
	{
		title: 'Monthly',
		value: 'month',
	},
	{
		title: 'Weekly',
		value: 'week',
	},
	{
		title: 'Daily',
		value: 'day',
	},
];

const Calendar = ({ view }: { view: ViewType }) => {
	const calendarRef = useRef<typeof Calendar>(null);
	const [selectedView, setSelectedView] = useState(view);
	const [holidays, setHolidays] = useState([]);
	const [searchTask, setSearchTask] = useState('');
	const [events, setEvents] = useState<any>([]);
	const [selectedDateRangeText, setSelectedDateRangeText] = useState('');

	useEffect(() => {
		setSelectedView(view);
	}, [view]);

	useEffect(() => {
		(async () => {
			const data = await fetch(
				'https://date.nager.at/api/v3/NextPublicHolidaysWorldwide'
			).then(async (res) => await res.json());
			setHolidays(data);
		})();
	}, []);

	const initialEvents = holidays
		.filter((el: any) => el.name.includes(searchTask))
		.map((holiday: any) => {
			return {
				id: holiday.countryCode,
				title: holiday.name,
				category: 'time',
				start: new TZDate(holiday.date),
				end: new TZDate(holiday.date).addHours(22),
				isReadOnly: true,
			};
		})
		.concat(events.filter((el: any) => el.title.includes(searchTask)));

	const getCalInstance = useCallback(
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		() => calendarRef.current?.getInstance?.(),
		[]
	);

	const updateRenderRangeText = useCallback(() => {
		const calInstance = getCalInstance();
		if (!calInstance) {
			setSelectedDateRangeText('');
		}

		const viewName = calInstance.getViewName();
		const calDate = calInstance.getDate();
		const rangeStart = calInstance.getDateRangeStart();
		const rangeEnd = calInstance.getDateRangeEnd();

		let year = calDate.getFullYear();
		let month = calDate.getMonth() + 1;
		let date = calDate.getDate();
		let dateRangeText: string;

		switch (viewName) {
			case 'month': {
				dateRangeText = `${year}-${month}`;
				break;
			}
			case 'week': {
				year = rangeStart.getFullYear();
				month = rangeStart.getMonth() + 1;
				date = rangeStart.getDate();
				const endMonth = rangeEnd.getMonth() + 1;
				const endDate = rangeEnd.getDate();

				const start = `${year}-${month < 10 ? '0' : ''}${month}-${
					date < 10 ? '0' : ''
				}${date}`;
				const end = `${year}-${endMonth < 10 ? '0' : ''}${endMonth}-${
					endDate < 10 ? '0' : ''
				}${endDate}`;
				dateRangeText = `${start} ~ ${end}`;
				break;
			}
			default:
				dateRangeText = `${year}-${month}-${date}`;
		}

		setSelectedDateRangeText(dateRangeText);
	}, [getCalInstance]);

	const onBeforeDeleteEvent: ExternalEventTypes['beforeDeleteEvent'] = (
		res
	) => {
		const { id, calendarId } = res;
		getCalInstance().deleteEvent(id, calendarId);
	};

	const onChangeSelect = (ev: ChangeEvent<HTMLSelectElement>) => {
		setSelectedView(ev.target.value as ViewType);
	};

	const onClickNavi = (ev: any) => {
		if ((ev.target as HTMLButtonElement).tagName === 'BUTTON') {
			const button = ev.target as HTMLButtonElement;
			const actionName = (
				button.getAttribute('data-action') ?? 'month'
			).replace('move-', '');
			getCalInstance()[actionName]();
			updateRenderRangeText();
		}
	};

	const onClickTimezonesCollapseBtn: ExternalEventTypes['clickTimezonesCollapseBtn'] =
		() => {
			const newTheme = {
				'week.daygridLeft.width': '100px',
				'week.timegridLeft.width': '100px',
			};
			getCalInstance().setTheme(newTheme);
		};

	const onBeforeUpdateEvent: ExternalEventTypes['beforeUpdateEvent'] = (
		updateData
	) => {
		const targetEvent = updateData.event;
		const changes = { ...updateData.changes };

		getCalInstance().updateEvent(
			targetEvent.id,
			targetEvent.calendarId,
			changes
		);
	};

	const onBeforeCreateEvent: ExternalEventTypes['beforeCreateEvent'] = (
		eventData
	) => {
		const event = {
			calendarId: eventData.calendarId || '',
			id: String(Math.random()),
			title: eventData.title,
			isAllday: eventData.isAllday,
			start: eventData.start,
			end: eventData.end,
			category: eventData.isAllday ? 'allday' : 'time',
		};

		getCalInstance().createEvents([event]);

		setEvents([event, ...events]);
	};

	const exportData = () => {
		const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
			JSON.stringify(initialEvents)
		)}`;
		const link = document.createElement('a');
		link.href = jsonString;
		link.download = 'data.json';

		link.click();
	};

	return (
		<>
			<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
				<TextField
					value={searchTask}
					label='Search tasks'
					style={{ marginBottom: '10px' }}
					placeholder='Search tasks'
					onChange={(e) => setSearchTask(e.target.value)}
				/>
				<Button variant={'contained'} onClick={exportData}>
					Export to JSON
				</Button>
			</div>
			<div style={{ display: 'flex', marginBottom: '10px', gap: 10 }}>
				<select onChange={onChangeSelect} value={selectedView}>
					{viewModeOptions.map((option, index) => (
						<option value={option.value} key={index}>
							{option.title}
						</option>
					))}
				</select>
				<span style={{ display: 'flex', gap: 10 }}>
					<Button
						data-action='move-prev'
						variant={'contained'}
						onClick={onClickNavi}>
						Prev
					</Button>
					<Button
						data-action='move-today'
						variant={'contained'}
						onClick={onClickNavi}>
						Today
					</Button>
					<Button
						data-action='move-next'
						variant={'contained'}
						onClick={onClickNavi}>
						Next
					</Button>
				</span>
				<span className='render-range'>{selectedDateRangeText}</span>
			</div>
			<ToastCalendar
				useDetailPopup={true}
				useFormPopup={true}
				height='900px'
				isReadOnly={false}
				events={initialEvents}
				view={selectedView}
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				ref={calendarRef}
				onBeforeDeleteEvent={onBeforeDeleteEvent}
				onClickTimezonesCollapseBtn={onClickTimezonesCollapseBtn}
				onBeforeUpdateEvent={onBeforeUpdateEvent}
				onBeforeCreateEvent={onBeforeCreateEvent}
			/>
		</>
	);
};

export default Calendar;
