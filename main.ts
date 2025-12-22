function toAscii(text: string) {
    const out = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) {
        out[i] = text.charCodeAt(i)
    }
    return out
}
const decoder = new TextDecoder()
// const listener = Deno.listenTls({
//    port: 587,
//    transport: "tcp",
//    cert: Deno.readTextFileSync("./cert.pem"),
//    key: Deno.readTextFileSync("./key.pem"),
// })
const listener = Deno.listen({
    port: 25,
    transport: "tcp",
})
while (true) {
    const conn = await listener.accept()
    ;(async () => {
        console.log("Connection")
        console.log(
            "sent:",
            await conn.write(
                toAscii(
                    "220 customsmtp.jmeow.net (do i need parentheses here) ready\n",
                ),
            ),
        )
        try {
            while (true) {
                const buf = new Uint8Array(1024)
                console.log("waiting")
                const bytesCount = await conn.read(buf)
                if (bytesCount == null) {
                    break
                }
                console.log("bytes:", bytesCount)
                console.log("received:", decoder.decode(buf), buf)
            }
        } catch (err) {
            console.log("error", err)
        }
        conn.close()
        console.log("closed")
    })()
}
