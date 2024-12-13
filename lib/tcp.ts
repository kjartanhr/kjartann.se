export const safe_close = (conn: Deno.TcpConn) => {
    try {
        conn.close();

        return;
    } catch {
        return;
    }
};

export const safe_write = async (conn: Deno.TcpConn, data: Uint8Array) => {
    try {
        await conn.write(data);

        try {
            await conn.closeWrite();
        } catch {
            return;
        }
    } catch {
        return;
    }
};
