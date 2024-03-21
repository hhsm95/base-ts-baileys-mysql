import { addKeyword, EVENTS } from "@builderbot/bot";
import AIClass from "../services/ai";
import { getHistoryParse, handleHistory } from "../utils/handleHistory";
import { generateTimer } from "../utils/generateTimer";
import { getCurrentCalendar } from "../services/calendar";
import { getFullCurrentDate } from "src/utils/currentDate";
import { flowConfirm } from "./confirm.flow";
import { isWithinInterval, format, parse, formatRelative } from "date-fns";
import { es } from "date-fns/locale";

const PROMPT_FILTER_DATE = `
### Contexto
Eres un asistente de inteligencia artificial. Tu propósito es determinar la fecha y hora que el cliente quiere, en el formato yyyy/MM/dd HH:mm:ss.

### Fecha y Hora Actual:
{CURRENT_DAY}

### Registro de Conversación:
{HISTORY}

Asistente: "{respuesta en formato (yyyy/MM/dd HH:mm:ss)}"
`;

const generatePromptFilter = (history: string) => {
  const nowDate = getFullCurrentDate();
  const mainPrompt = PROMPT_FILTER_DATE.replace("{HISTORY}", history).replace(
    "{CURRENT_DAY}",
    nowDate
  );

  return mainPrompt;
};

const flowSchedule = addKeyword(EVENTS.ACTION)
  .addAction(async (_, { extensions, state, flowDynamic, endFlow }) => {
    await flowDynamic("Dame un momento para consultar la agenda...");
    const ai = extensions.ai as AIClass;
    const history = getHistoryParse(state);
    const appointmentDates = await getCurrentCalendar();

    const listParse = appointmentDates.map((d) => ({
      startDate: parse(d.startDate, "yyyy/MM/dd HH:mm:ss", new Date()),
      endDate: parse(d.endDate, "yyyy/MM/dd HH:mm:ss", new Date()),
    }));

    const promptFilter = generatePromptFilter(history);

    const { date } = await ai.desiredDateFn([
      {
        role: "system",
        content: promptFilter,
      },
    ]);

    console.log({ aiDate: date });

    const desiredDate = parse(date, "yyyy/MM/dd HH:mm:ss", new Date());

    const isDateAvailable = listParse.every(
      ({ startDate, endDate }) =>
        !isWithinInterval(desiredDate, { start: startDate, end: endDate })
    );

    if (!isDateAvailable) {
      const m =
        "Lo siento, esa hora ya está reservada. ¿Alguna otra fecha y hora?";
      await flowDynamic(m);
      await handleHistory({ content: m, role: "assistant" }, state);
      return endFlow();
    }

    const formattedRelative = formatRelative(desiredDate, new Date(), {
      locale: es,
    });
    const message = `¡Perfecto! Tenemos disponibilidad el ${formattedRelative}. ¿Confirmo tu cita? *si*`;
    await handleHistory({ content: message, role: "assistant" }, state);
    await state.update({ desiredDate });

    const chunks = message.split(".");
    for (const chunk of chunks) {
      await flowDynamic([
        { body: chunk.trim(), delay: generateTimer(150, 250) },
      ]);
    }
  })
  .addAction(
    { capture: true },
    async ({ body }, { gotoFlow, flowDynamic, state }) => {
      console.log("what: ", body);

      if (body.toLowerCase().includes("si")) {
        return gotoFlow(flowConfirm);
      }

      await flowDynamic("¿Alguna otra fecha y hora?");
      await state.update({ desiredDate: null });
    }
  );

export { flowSchedule };
