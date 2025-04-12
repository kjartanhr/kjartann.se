import type { T_Http_Request, T_Http_Response } from "@/lib/http.ts";
import { render } from "@/lib/views.ts";
import { min_status_response } from "@/lib/html.ts";

export default async function handler(
    req: T_Http_Request,
): Promise<T_Http_Response> {
    if (req.method === "HEAD") {
        return req.respond({
            status: 404,
            headers: { content_type: "text/html" },
        });
    }

    if (req.method !== "GET") {
        return req.respond({
            status: 405,
            headers: { content_type: "text/html" },
            body: min_status_response(405),
        });
    }

    if (req.pathname.startsWith("/is")) {
        return req.respond({
            status: 404,
            headers: {
                content_type: "text/html",
            },
            body: await render("pages/404.vto", {
                title: "Fannst ekki",
                not_found_title: "404 síðan fannst ekki",
                not_found_description:
                    "Síðan sem um var beðið finnst ekki í kerfinu.",
            }),
        });
    }

    return req.respond({
        status: 404,
        headers: {
            content_type: "text/html",
        },
        body: await render("pages/404.vto", { title: "Not found" }),
    });
}
