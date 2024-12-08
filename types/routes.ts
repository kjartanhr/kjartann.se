export type T_Route_Request = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params: { [key: string]: string };
};
