import { getHistoryParse } from "../utils/handleHistory";
import AIClass from "../services/ai";
import { flowSeller } from "../flows/seller.flow";
import { flowSchedule } from "../flows/schedule.flow";

const PROMPT_DISCRIMINATOR = `### Historial de Conversación (Vendedor/Cliente) ###
{HISTORY}

### Intenciones del Usuario ###

**HABLAR**: Selecciona esta acción si el cliente parece querer hacer una pregunta o necesita más información.
**PROGRAMAR**: Selecciona esta acción si el cliente muestra intención de programar una cita.

### Instrucciones ###

Por favor, clasifica la siguiente conversación según la intención del usuario.`;

export default async (ctx, { state, gotoFlow, extensions, provider }) => {
  const ai = extensions.ai as AIClass;
  const history = getHistoryParse(state);
  const prompt = PROMPT_DISCRIMINATOR;

  console.log(prompt.replace("{HISTORY}", history));

  const { prediction } = await ai.determineChatFn(
    [
      {
        role: "system",
        content: prompt.replace("{HISTORY}", history),
      },
    ],
    "gpt-3.5-turbo"
  );

  console.log({ prediction });

  if (prediction.includes("HABLAR")) return gotoFlow(flowSeller);
  if (prediction.includes("PROGRAMAR")) return gotoFlow(flowSchedule);
};
