import "dotenv/config";
import {
  createBot,
  createProvider,
  MemoryDB as Database,
} from "@builderbot/bot";
// import { MysqlAdapter as Database } from "@builderbot/database-mysql";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import { addMinutes, parse, format } from "date-fns";

import { HTTP_SERVER_PORT, OPEN_API_KEY } from "./config";
import AIClass from "./services/ai";
import flow from "./flows";
import {
  getServiceDuration,
  isScheduleAvailable,
  isAppointmentAvailable,
} from "./services/database/queries";

const ai = new AIClass(OPEN_API_KEY, "gpt-3.5-turbo");

const main = async () => {
  const businessId = 1;
  const serviceId = 1;
  const desirableDateStr = "2024/03/23 14:00:00";

  const duration = await getServiceDuration(serviceId);
  const desirableDate = parse(
    desirableDateStr,
    "yyyy/MM/dd HH:mm:ss",
    new Date()
  );
  const desirableEndDate = addMinutes(desirableDate, duration);
  const desirableEndDateStr = format(desirableEndDate, "yyyy/MM/dd HH:mm:ss");
  const isScheduleAvailable_ = await isScheduleAvailable(
    businessId,
    desirableDate,
    desirableEndDate
  );
  const isAppointmentAvailable_ = await isAppointmentAvailable(
    businessId,
    desirableDate,
    desirableEndDate
  );

  console.log({
    duration,
    desirableDateStr,
    desirableEndDateStr,
    isScheduleAvailable_,
    isAppointmentAvailable_,
  });
  return;

  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database();
  /*const adapterDB = new Database({
    host: MYSQL_DB_HOST,
    user: MYSQL_DB_USER,
    database: MYSQL_DB_NAME,
    password: MYSQL_DB_PASSWORD,
  });*/
  const { handleCtx, httpServer } = await createBot(
    {
      flow,
      provider: adapterProvider,
      database: adapterDB,
    },
    { extensions: { ai } }
  );

  httpServer(+HTTP_SERVER_PORT);

  adapterProvider.http.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );
};

main();
