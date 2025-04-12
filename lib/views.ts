import * as path from "path";
// @deno-types="@types/html-minifier"
import { minify } from "html-minifier";
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
            turnstile_site_key: Deno.env.get("TURNSTILE_PK"),
        },
    );

    return minify(result.content, {
        removeComments: false,
        collapseWhitespace: true,
        minifyJS: true,
    });
};
