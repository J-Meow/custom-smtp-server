const altID = Deno.args[0]
if (!altID) {
    throw "No ID"
}
const email = "jmeow.hc.alt." + altID + "@customsmtp.jmeow.net"
console.log(`Creating alt with ID ${altID} and email ${email}`)

import { launch } from "jsr:@astral/astral"

// await using browser = await launch({ headless: false })
await using browser = await launch()

await using page = await browser.newPage("https://account.hackclub.com")

await page.waitForNetworkIdle()
await (await page.$(`input[type="email"]`))!.type(email)
await fetch("http://" + Deno.env.get("SERVERURL") + ":8045/email/to/" + email, {
    headers: { authorization: "Bearer " + Deno.env.get("APIKEY") },
    method: "DELETE",
})
await (await page.$(`button[type="submit"]`))!.click()
await page.waitForNavigation()
if (!(await page.$(`#code-input-code`))) {
    await (await page.$(`#identity_first_name`))!.type("JmeowAlt")
    await (await page.$(`#identity_last_name`))!.type("Id " + altID)
    await (await page.$(`#identity_birthday`))!.type("01012010")
    await (await page.$(`input[type="submit"]`))!.click()
    await page.waitForNavigation()
}

async function getOTP() {
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

await (await page.$(`#code-input-code`))!.type(await getOTP())
await (await page.$(`input[type="submit"]`))!.click()
try {
    await page.waitForNavigation()
} catch (_) {
    console.log("Navigation took too long")
}
try {
    await (await page.$(".c-button--primary"))!.click()
} catch (_) {
    console.log("No putton to press")
}
try {
    await page.goto("https://hackclub.slack.com", { waitUntil: "load" })
} catch (_) {
    console.log("Network Idle took too long")
}
try {
    await (await page.$(".c-button--primary"))!.click()
} catch (_) {
    console.log("No putton to press")
}
try {
    await page.waitForNavigation({ waitUntil: "load" })
    await page.waitForTimeout(1000)
} catch (_) {
    console.log("Loading took too long")
}
try {
    if (page.url.includes("/tos")) {
        await (await page.$(".c-button--primary"))!.click()
    }
} catch (_) {
    console.log("No TOS button")
}
await page.waitForFunction(`!!document.querySelector("div.p-client_container")`)
await page.waitForTimeout(1000)
if (await page.$(`[data-qa="setup_page_welcome_next"]`)) {
    await (await page.$(`[data-qa="setup_page_welcome_next"]`))!.click()
}
await page.waitForTimeout(1000)
if (await page.$(`[data-qa="setup_page_people_skip"]`)) {
    await (await page.$(`[data-qa="setup_page_people_skip"]`))!.click()
}

await page.waitForFunction(
    `!!document.querySelector("div.p-top_nav__search__container")`,
)
console.log("Slack loaded")
try {
    await page.waitForTimeout(3000)
    if (await page.$(`[data-qa-action-id="coc_continue"]`)) {
        await (await page.$(`[data-qa-action-id="coc_continue"]`))!.click()
        await page.waitForFunction(
            `!!document.querySelector('[data-qa-action-id="tutorial_agree"]')`,
        )
        await (await page.$(`[data-qa-action-id="tutorial_agree"]`))!.click()
        await page.waitForTimeout(3000)
    }
} catch (_) {
    console.log("No code of conduct to accept")
}
const xoxd = (await page.cookies("https://app.slack.com")).filter(
    (x) => x.name == "d",
)[0].value
const xoxc = await page.evaluate(
    `JSON.parse(localStorage.getItem("localConfig_v2")).teams.E09V59WQY1E.token`,
)
await Deno.writeTextFile(
    "hackclubalts.txt",
    `${altID} ${email} ${xoxc} ${xoxd}\n`,
    { append: true },
)
console.log(email, xoxc, xoxd)
console.log("Go to https://slack.com and run this to sign in:")
console.log(
    `document.cookie = "d=${xoxd}; Domain=.slack.com"; location.href = "https://hackclub.slack.com"`,
)
