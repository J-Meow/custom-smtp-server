const email = "testalthackclub@customsmtp.jmeow.net"

import { launch } from "jsr:@astral/astral"

// await using browser = await launch({ headless: false })
await using browser = await launch()

await using page = await browser.newPage("https://account.hackclub.com")

await page.waitForNetworkIdle()
await (await page.$(`input[type="email"]`))!.type(email)
await (await page.$(`button[type="submit"]`))!.click()

async function getOTP() {
    await fetch(
        "http://" + Deno.env.get("SERVERURL") + ":8045/email/to/" + email,
        {
            headers: { authorization: "Bearer " + Deno.env.get("APIKEY") },
            method: "DELETE",
        },
    )
    let otp = ""
    while (true) {
        try {
            const response = await (
                await fetch(
                    "http://" +
                        Deno.env.get("SERVERURL") +
                        ":8045/email/to/" +
                        email,
                    {
                        headers: {
                            authorization: "Bearer " + Deno.env.get("APIKEY"),
                        },
                    },
                )
            ).json()
            if (response) {
                otp = response.subject.split(" ")[0]
                break
            }
        } catch (_) {
            // Nothing :)
        }
        console.log("Waiting for email")
        await new Promise((x) => setTimeout(x, 1000))
    }
    await fetch(
        "http://" + Deno.env.get("SERVERURL") + ":8045/email/to/" + email,
        {
            headers: { authorization: "Bearer " + Deno.env.get("APIKEY") },
            method: "DELETE",
        },
    )
    return otp
}

await page.waitForNavigation()
await (await page.$(`#code-input-code`))!.type(await getOTP())
await (await page.$(`input[type="submit"]`))!.click()
await page.waitForNavigation()
await page.goto("https://hackclub.slack.com", { waitUntil: "load" })
await (await page.$(".c-button--primary"))!.click()
await page.waitForFunction(
    `!!document.querySelector("div.p-top_nav__search__container")`,
)
const xoxd = (await page.cookies("https://app.slack.com")).filter(
    (x) => x.name == "d",
)[0].value
const xoxc = await page.evaluate(
    `JSON.parse(localStorage.getItem("localConfig_v2")).teams.E09V59WQY1E.token`,
)
console.log(xoxc, xoxd)
console.log("Go to https://slack.com and run this to sign in:")
console.log(
    `document.cookie = "d=${xoxd}; Domain=.slack.com"; location.href = "https://hackclub.slack.com"`,
)
// await page.waitForTimeout(999999)
