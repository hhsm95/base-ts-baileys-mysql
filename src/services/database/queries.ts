import { ejecutarConsulta } from ".";

interface ServiceDuration {
  duration: number;
}

interface ScheduleAvailable {
  scheduleAvailable: number;
}

interface AppointmentAvailable {
  appointmentAvailable: number;
}

export const getServiceDuration = async (
  serviceId: number
): Promise<number | undefined> => {
  try {
    const results: ServiceDuration[] = await ejecutarConsulta<ServiceDuration>(
      "SELECT duration FROM SERVICES WHERE id = ?;",
      [serviceId]
    );
    console.log("Resultados:", results);
    if (results.length !== 1) {
      return undefined;
    }
    return results[0].duration;
  } catch (error) {
    console.error("Error:", error);
    return undefined;
  }
};

export const isScheduleAvailable = async (
  businessId: number,
  desirableDate: Date,
  desirableEndDate: Date
): Promise<boolean> => {
  try {
    const results: ScheduleAvailable[] =
      await ejecutarConsulta<ScheduleAvailable>(
        `
      SELECT COUNT(id) > 0 AS 'scheduleAvailable'
      FROM OPENING_HOURS
      WHERE business_id = ?
        AND DAYOFWEEK(?) = day_of_week_id
        AND NOT (
          (TIME(?) < opening_time) OR
          (TIME(?) > closing_time)
        );
      `,
        [businessId, desirableDate, desirableDate, desirableEndDate]
      );
    console.log("Resultados:", results);
    if (results.length !== 1) {
      return false;
    }
    return results[0].scheduleAvailable === 1;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};

export const isAppointmentAvailable = async (
  businessId: number,
  desirableDate: Date,
  desirableEndDate: Date
): Promise<boolean> => {
  try {
    const results: AppointmentAvailable[] =
      await ejecutarConsulta<AppointmentAvailable>(
        `
      SELECT COUNT(a.id) = 0 AS appointmentAvailable
      FROM APPOINTMENTS a
      INNER JOIN SERVICES s ON a.service_id = s.id
      WHERE a.business_id = ?
        AND NOT (
          (? >= a.appointment_date + INTERVAL s.duration MINUTE) OR
          (? <= a.appointment_date)
      );
      `,
        [businessId, desirableDate, desirableEndDate]
      );
    console.log("Resultados:", results);
    if (results.length !== 1) {
      return false;
    }
    return results[0].appointmentAvailable === 1;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
};
