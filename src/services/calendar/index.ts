import { MAKE_ADD_TO_CALENDAR, MAKE_GET_FROM_CALENDAR } from "src/config";

interface AppointmentDate {
  startDate: string;
  name: string;
  endDate: string;
}

const getCurrentCalendar = async (): Promise<AppointmentDate[]> => {
  const dataCalendarApi = await fetch(MAKE_GET_FROM_CALENDAR);
  const json: AppointmentDate[] = await dataCalendarApi.json();
  console.log({ json });
  const list = json.filter(
    ({ startDate, endDate, name }) => !!startDate && !!name
  );
  return list;
};

const appToCalendar = async (payload: {
  name: string;
  service: string;
  startDate: string;
  endDate: string;
  phone: string;
  email: string;
}) => {
  try {
    const dataApi = await fetch(MAKE_ADD_TO_CALENDAR, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return dataApi;
  } catch (err) {
    console.log(`error: `, err);
  }
};

export { getCurrentCalendar, appToCalendar };
