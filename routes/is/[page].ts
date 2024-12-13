import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render } from "@/lib/views.ts";
import not_found_handler from "@/routes/404.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    if (req.method !== "GET") {
        return req.respond({ status: 405 });
    }

    if (!req.params.page || req.params.page.trim() === "") {
        return req.respond({
            status: 200,
            headers: {
                content_type: "text/html",
            },
            body: await render("pages/index.vto", { title: "Heim" }),
        });
    }

    switch (req.params.page) {
        case "um": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/um.vto", { title: "Um mig" }),
            });
        }

        case "verkefni": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/verkefni.vto", { title: "Verkefni" }),
            });
        }

        case "impressum": {
            return req.respond({
                status: 301,
                headers: { location: "/is/aletrun" },
            });
        }

        case "aletrun": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/aletrun.vto", { title: "Áletrun" }),
            });
        }

        default: {
            return await not_found_handler(req);
        }
    }
}
