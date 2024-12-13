import * as path from "path";
import Vento from "@vento/vento";

const vento = Vento();

export const render = async (
    template: string,
    data?: Record<string, unknown>,
) => {
    const result = await vento.run(
        path.join(Deno.cwd(), "views", template),
        {
            ...data,
            now: new Date(),
        },
    );

    return result.content;
};
