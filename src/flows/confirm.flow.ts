import { addKeyword, EVENTS } from "@builderbot/bot";
import { clearHistory } from "../utils/handleHistory";
import { addMinutes, format } from "date-fns";
import { appToCalendar } from "src/services/calendar";
import { DELAYS, NUM_SERVICES, SERVICES } from "src/utils/constants";
import emailRegexSafe from "email-regex-safe";

const flowConfirm = addKeyword(EVENTS.ACTION)
  .addAction(async (ctx, { flowDynamic, provider }) => {
    setTimeout(() => {
      provider.sendPresenceUpdate(ctx.key.remoteJid, "composing");
    }, 200);
    await flowDynamic(
      [
        "Ok, voy a pedirte unos datos para confirmar la cita",
        "¿Cuál es el servicio que deseas agendar?",
        "Por favor responde con el número de alguno de los siguientes:",
        "1. Corte de cabello\n2. Alisado de cabello\n3. Manicure\n4. Pedicure",
      ],
      {
        delay: DELAYS.SHORT_MSG,
      }
    );
  })
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, endFlow, fallBack }) => {
      if (ctx.body.toLocaleLowerCase().includes("cancelar")) {
        clearHistory(state);
        return endFlow("¿Cómo puedo ayudarte?");
      }

      if (!NUM_SERVICES.includes(ctx.body)) {
        return fallBack(
          `Debes escribir uno de los números: ${NUM_SERVICES.join(", ")}`
        );
      }

      const service = SERVICES[ctx.body].name;
      const duration = SERVICES[ctx.body].duration;
      await state.update({ service, duration });
      await flowDynamic("¿A nombre de quién será la cita?", {
        delay: DELAYS.SHORT_MSG,
      });
    }
  )
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      const name = ctx.body.trim();
      if (name.length < 3) {
        return fallBack("Debes ingresar un nombre válido");
      }

      await state.update({ name });
      await flowDynamic(
        [
          `Gracias *${name}*`,
          "Para enviarte un recordatorio, ¿cuál es tu email?",
        ],
        {
          delay: DELAYS.SHORT_MSG,
        }
      );
    }
  )
  .addAction(
    { capture: true },
    async (ctx, { state, flowDynamic, fallBack }) => {
      const email = ctx.body.trim().toLowerCase();
      if (!emailRegexSafe({ exact: true }).test(email)) {
        return fallBack("Debes ingresar un email válido");
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
        email: email,
      };
      console.log(dateObject);

      await appToCalendar(dateObject);

      clearHistory(state);
      await flowDynamic(
        [
          "¡Listo! Tu cita fue agendada",
          "Cualquier duda estamos para atenderte",
        ],
        { delay: DELAYS.SHORT_MSG }
      );
    }
  );

export { flowConfirm };
