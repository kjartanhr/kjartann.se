import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render as render_view } from "@/lib/views.ts";
import not_found_handler from "@/routes/404.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    const render = (template: string, data?: Record<string, unknown>) => {
        return render_view(template, {
            ...data,
            language: "is",
            pathname: req.pathname,
        });
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
        return req.respond({ status: 405 });
    }

    if (!req.params.page || req.params.page.trim() === "") {
        return req.respond({
            status: 200,
            headers: {
                content_type: "text/html",
            },
            body: await render("pages/is/index.vto", { title: "Heim" }),
        });
    }

    switch (req.params.page) {
        case "um": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/is/um.vto", { title: "Um mig" }),
            });
        }

        case "about": {
            return req.respond({
                status: 308,
                headers: { location: "/is/um" },
            });
        }

        case "verkefni": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/is/verkefni.vto", {
                    title: "Verkefni",
                }),
            });
        }

        case "work": {
            return req.respond({
                status: 308,
                headers: { location: "/is/verkefni" },
            });
        }

        case "samband": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/is/samband.vto", {
                    title: "Hafa samband",
                }),
            });
        }

        case "contact": {
            return req.respond({
                status: 308,
                headers: { location: "/is/samband" },
            });
        }

        case "aletrun": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/is/aletrun.vto", {
                    title: "Áletrun",
                }),
            });
        }

        case "impressum": {
            return req.respond({
                status: 308,
                headers: { location: "/is/aletrun" },
            });
        }

        default: {
            return await not_found_handler(req);
        }
    }
}
