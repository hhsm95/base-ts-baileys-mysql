import "dotenv/config";
import { createBot, createProvider } from "@builderbot/bot";
import { MysqlAdapter as Database } from "@builderbot/database-mysql";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import AIClass from "./services/ai";
import {
  HTTP_SERVER_PORT,
  MYSQL_DB_HOST,
  MYSQL_DB_NAME,
  MYSQL_DB_PASSWORD,
  MYSQL_DB_USER,
  OPEN_API_KEY,
} from "./config";
import flow from "./flows";

const ai = new AIClass(OPEN_API_KEY, "gpt-3.5-turbo");

const main = async () => {
  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database({
    host: MYSQL_DB_HOST,
    user: MYSQL_DB_USER,
    database: MYSQL_DB_NAME,
    password: MYSQL_DB_PASSWORD,
  });

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
