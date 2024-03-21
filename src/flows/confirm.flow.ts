import { addKeyword, EVENTS } from "@builderbot/bot";
import { clearHistory } from "../utils/handleHistory";
import { addMinutes, format } from "date-fns";
import { appToCalendar } from "src/services/calendar";
import { DELAYS, NUM_SERVICES, SERVICES } from "src/utils/constants";

const DURATION_MEET = process.env.DURATION_MEET ?? 45;
/**
 * Encargado de pedir los datos necesarios para registrar el evento en el calendario
 */
const flowConfirm = addKeyword(EVENTS.ACTION)
  .addAction(async (_, { flowDynamic }) => {
    await flowDynamic("Ok, voy a pedirte unos datos para confirmar la cita", {
      delay: DELAYS.SHORT_MSG,
    });
    await flowDynamic("¿Cuál es el servicio que deseas agendar?", {
      delay: DELAYS.SHORT_MSG,
    });
    await flowDynamic(
      "Por favor responde con el número de alguno de los siguientes:",
      { delay: DELAYS.SHORT_MSG }
    );
    await flowDynamic("1. Corte de cabello", { delay: DELAYS.SHORT_MSG });
    await flowDynamic("2. Alisado de cabello", { delay: DELAYS.SHORT_MSG });
    await flowDynamic("3. Manicure", { delay: DELAYS.SHORT_MSG });
    await flowDynamic("4. Pedicure", { delay: DELAYS.SHORT_MSG });
  })
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, endFlow, fallBack }) => {
      if (ctx.body.toLocaleLowerCase().includes("cancelar")) {
        clearHistory(state);
        return endFlow(`¿Como puedo ayudarte?`);
      }

      if (!NUM_SERVICES.includes(ctx.body)) {
        return fallBack(
          `Debes escribir uno de los números: ${NUM_SERVICES.join(", ")}`
        );
      }

      const name = ctx.name || "";
      const service = SERVICES[ctx.body].name;
      const duration = SERVICES[ctx.body].duration;
      await state.update({ name, service, duration });
      await flowDynamic(`Ultima pregunta ¿Cual es tu email?`);
    }
  )
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      if (!ctx.body.includes("@")) {
        return fallBack(`Debes ingresar un mail correcto`);
      }

      const duration = state.get("duration");
      const dateObject = {
        name: state.get("name"),
        service: state.get("service"),
        startDate: format(state.get("desiredDate"), "yyyy/MM/dd HH:mm:ss"),
        endDate: format(
          addMinutes(state.get("desiredDate"), duration),
          "yyyy/MM/dd HH:mm:ss"
        ),
        phone: ctx.from,
        email: ctx.body,
      };

      await appToCalendar(dateObject);

      clearHistory(state);
      await flowDynamic("Listo! agendado Buen dia");
    }
  );

export { flowConfirm };
