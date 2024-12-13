// deno-lint-ignore-file

window._namespace_kjartann_se = {
    ajax: () => {
        // deno-fmt-ignore-line
        const site_base_url = `${window.location.protocol}//${window.location.host}`

        const parse_html = (html) => {
            let state = "STATE_HEAD";
            let title_offset = 0;
            let title_content = "";
            let body_offset = 0;
            let body_content = "";
            for (let i = 0; i < html.length; i++) {
                const char = html[i];

                switch (state) {
                    case "STATE_HEAD": {
                        if (
                            char === "<" && html[i + 1] === "b" &&
                            html[i + 2] === "o" && html[i + 3] === "d" &&
                            html[i + 4] === "y" && html[i + 5] === ">"
                        ) {
                            body_offset = i + 5;
                            state = "STATE_BODY";
                        }

                        if (
                            char === "<" && html[i + 1] === "t" &&
                            html[i + 2] === "i" && html[i + 3] === "t" &&
                            html[i + 4] === "l" && html[i + 5] === "e" &&
                            html[i + 6] === ">"
                        ) {
                            title_offset = i + 6;
                            state = "STATE_TITLE";
                        }

                        continue;
                    }

                    case "STATE_TITLE": {
                        if (
                            char === "<" && html[i + 1] === "/" &&
                            html[i + 2] === "t" &&
                            html[i + 3] === "i" && html[i + 4] === "t" &&
                            html[i + 5] === "l" && html[i + 6] === "e" &&
                            html[i + 7] === ">"
                        ) {
                            state = "STATE_HEAD";

                            continue;
                        }

                        if (i > title_offset) {
                            title_content += char;
                        }

                        continue;
                    }

                    case "STATE_BODY": {
                        if (
                            html[i + 1] === "<" && html[i + 2] === "/" &&
                            html[i + 3] === "b" && html[i + 4] === "o" &&
                            html[i + 5] === "d" && html[i + 6] === "y" &&
                            html[i + 7] === ">"
                        ) {
                            state = "STATE_END";
                        }

                        if (i > body_offset) {
                            body_content += char;
                        }
                    }
                }
            }

            return { title: title_content, body: body_content };
        };

        const fetch_page = async (url) => {
            let res;
            try {
                res = await fetch(url, {
                    signal: AbortSignal.timeout(5_000),
                });
            } catch {
                return null;
            }

            if (!res || (res.status !== 404 && !res.ok)) {
                return null;
            }

            const content_type = res.headers.get("content-type");
            if (!content_type || content_type.trim() !== "text/html") {
                return null;
            }

            let html;
            try {
                html = await res.text();
            } catch {
                return null;
            }

            if (!html) {
                return null;
            }

            return parse_html(html);
        };

        const handle_local_anchor_click = async (event) => {
            const MIDDLE_MOUSE_BUTTON = 1;
            if (event.button === MIDDLE_MOUSE_BUTTON) {
                return;
            }

            event.preventDefault();

            if (event.currentTarget) {
                const href = event.currentTarget.href;
                const data = await fetch_page(href);
                if (data) {
                    document.body.innerHTML = data.body;
                    document.title = data.title;
                    history.pushState({}, "", href);
                    hook_anchors();
                }
            }
        };

        const hook_anchors = () => {
            const anchors = document.querySelectorAll("a");
            for (let i = 0; i < anchors.length; i++) {
                const a = anchors[i];

                if (!a.href || !a.href.startsWith(site_base_url)) {
                    continue;
                }

                a.addEventListener("click", handle_local_anchor_click);
            }
        };

        hook_anchors();
    },
};

window._namespace_kjartann_se.ajax();
