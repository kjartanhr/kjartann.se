import type { T_Http_Response, T_Http_Route_Request } from "@/lib/http.ts";
import { render as render_view } from "@/lib/views.ts";
import not_found_handler from "@/routes/404.ts";

export default async function handler(
    req: T_Http_Route_Request,
): Promise<T_Http_Response> {
    const render = (template: string, data?: Record<string, unknown>) => {
        return render_view(template, {
            ...data,
            language: "en",
            pathname: req.pathname,
        });
    };

    if (req.method !== "GET") {
        return req.respond({ status: 405 });
    }

    if (!req.params.page || req.params.page.trim() === "") {
        return req.respond({
            status: 200,
            headers: {
                content_type: "text/html",
            },
            body: await render("pages/en/index.vto", { title: "Homepage" }),
        });
    }

    switch (req.params.page) {
        case "about": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/en/about.vto", { title: "About me" }),
            });
        }

        case "um": {
            return req.respond({
                status: 308,
                headers: { location: "/en/about" },
            });
        }

        case "work": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/en/work.vto", {
                    title: "My work",
                }),
            });
        }

        case "verkefni": {
            return req.respond({
                status: 308,
                headers: { location: "/en/work" },
            });
        }

        case "contact": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/en/contact.vto", {
                    title: "Contact me",
                }),
            });
        }

        case "samband": {
            return req.respond({
                status: 308,
                headers: { location: "/en/contact" },
            });
        }

        case "impressum": {
            return req.respond({
                status: 200,
                headers: {
                    content_type: "text/html",
                },
                body: await render("pages/en/impressum.vto", {
                    title: "Impressum",
                }),
            });
        }

        case "aletrun": {
            return req.respond({
                status: 308,
                headers: { location: "/en/impressum" },
            });
        }

        default: {
            return await not_found_handler(req);
        }
    }
}
