import { addKeyword, EVENTS } from "@builderbot/bot";
import AIClass from "../services/ai";
import { getHistoryParse, handleHistory } from "../utils/handleHistory";
import { generateTimer } from "../utils/generateTimer";
import { getCurrentCalendar } from "../services/calendar";
import { flowConfirm } from "./confirm.flow";
import { isWithinInterval, parse, formatRelative, format } from "date-fns";
import { es } from "date-fns/locale";

const PROMPT_FILTER_DATE = `
### Contexto
Eres un asistente de inteligencia artificial. Tu propósito es determinar la fecha y hora que el cliente quiere, en el formato yyyy/MM/dd HH:mm:ss.
Solo elegir fechas y horas en los siguientes rangos de apertura:
{HORARIOS_ATENCION}
Atención: Solo elegir horas cerradas, ejemplo 1pm, 2pm, nunca en horas con minutos explicitos.
Atención: Si se elige un horario fuera del rango del horario de apertura entonces elegir la fecha y hora más próxima al horario de apertura.

### Fecha y Hora Actual:
{CURRENT_DAY}

### Registro de Conversación:
{HISTORY}

Asistente: "{respuesta en formato (yyyy/MM/dd HH:mm:ss)}"
`;

const HORARIOS_ATENCION = `
- Lunes a viernes de 9am a 6pm
- Sabados de 10am a 2pm
- El domingo no hay horarios disponibles
`;

const generatePromptFilter = (history: string) => {
  const nowDate = format(new Date(), "PPPPpppp", { locale: es });
  const mainPrompt = PROMPT_FILTER_DATE.replace("{HISTORY}", history)
    .replace("{CURRENT_DAY}", nowDate)
    .replace("{HORARIOS_ATENCION}", HORARIOS_ATENCION);

  return mainPrompt;
};

const flowSchedule = addKeyword(EVENTS.ACTION)
  .addAction(
    async (ctx, { extensions, state, flowDynamic, endFlow, provider }) => {
      setTimeout(() => {
        provider.sendPresenceUpdate(ctx.key.remoteJid, "composing");
      }, 200);
      await flowDynamic("Dame un momento para consultar la agenda...");
      const ai = extensions.ai as AIClass;
      const history = getHistoryParse(state);
      const appointmentDates = await getCurrentCalendar();

      const listParse = appointmentDates.map((d) => ({
        startDate: parse(d.startDate, "yyyy/MM/dd HH:mm:ss", new Date()),
        endDate: parse(d.endDate, "yyyy/MM/dd HH:mm:ss", new Date()),
      }));

      const promptFilter = generatePromptFilter(history);
      console.log(promptFilter);

      let hasError = true;
      let desiredDate = new Date();
      while (hasError) {
        hasError = false;
        const { date } = await ai.desiredDateFn([
          {
            role: "system",
            content: promptFilter,
          },
        ]);

        console.log({ aiDate: date });
        if (date.length !== 19) {
          console.log("Fecha invalida");
          hasError = true;
        } else {
          desiredDate = parse(date, "yyyy/MM/dd HH:mm:ss", new Date());
        }
      }

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
      const message = `Tenemos disponibilidad *${formattedRelative}*. ¿Confirmo tu cita?. Por favor responde con un *Si*`;
      await handleHistory({ content: message, role: "assistant" }, state);
      await state.update({ desiredDate });

      const chunks = message.split(".");
      for (const chunk of chunks) {
        await flowDynamic([
          { body: chunk.trim(), delay: generateTimer(150, 250) },
        ]);
      }
    }
  )
  .addAction(
    { capture: true },
    async ({ body }, { gotoFlow, flowDynamic, state }) => {
      if (body.toLowerCase().includes("si")) {
        return gotoFlow(flowConfirm);
      }

      await flowDynamic("¿Alguna otra fecha y hora?");
      await state.update({ desiredDate: null });
    }
  );

export { flowSchedule };
