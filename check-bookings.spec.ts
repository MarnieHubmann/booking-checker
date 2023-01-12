import { test } from "@playwright/test";
import { readdirSync, rmSync } from "fs";
import nodemailer, { SentMessageInfo } from "nodemailer";
import smtpTransport from "nodemailer-smtp-transport";
import { Attachment } from "nodemailer/lib/mailer";

function setupEmailer() {
  // Check gmail credentials are set
  if (!process.env?.GMAIL_TO) {
    throw new Error(
      "Please set the GMAIL_TO environment variable or value in .env"
    );
  }
  if (!process.env?.GMAIL_FROM) {
    throw new Error(
      "Please set the GMAIL_FROM environment variable or value in .env"
    );
  }
  if (!process.env?.GMAIL_PASSWORD) {
    throw new Error(
      "Please set the GMAIL_PASSWORD environment variable or value in .env"
    );
  }

  const transporter = nodemailer.createTransport(
    smtpTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      auth: {
        user: process.env.GMAIL_FROM,
        pass: process.env.GMAIL_PASSWORD,
      },
    })
  );

  return async ({
    subject,
    text,
    attachments,
  }: {
    subject: string;
    text: string;
    attachments: Attachment[];
  }): Promise<SentMessageInfo> => {
    const emailToSendTo = process.env.GMAIL_TO?.split(",") ?? [];
    const emails = emailToSendTo.map((to) =>
      transporter.sendMail({
        from: process.env.GMAIL_FROM,
        to,
        subject,
        text,
        attachments,
      })
    );
    return Promise.all(emails);
  };
}

function getScreenshotsAsAttachments(): Attachment[] {
  return readdirSync(__dirname + "/screenshots").map((file) => ({
    path: __dirname + "/screenshots/" + file,
    filename: file,
  }));
}

test("check if there are fatboy slim tickets available", async ({ page }) => {
  rmSync(__dirname + "/screenshots", { recursive: true, force: true });
  const sendEmail = setupEmailer();

  // Visit ticket page
  await page.goto(
    "https://www.moshtix.co.nz/v2/event/fatboy-slim-wellington/142796"
  );

  await page.waitForTimeout(5000);

  // Get final release general admission ticket row
  const ticketRow = await page
    .locator(
      "li.event-display-group-container:first-child li.event-ticket-type:last-child"
    )
    .first()
    .innerText();

  const isAnyTicketsAvailable = !ticketRow.includes("Allocation Exhausted");
  if (!isAnyTicketsAvailable && process.env?.SEND_FOR_FAILURE !== "true") {
    return;
  }

  await page.screenshot({
    path: __dirname + "/screenshots/screenshot.png",
    fullPage: true,
  });

  if (isAnyTicketsAvailable) {
    await sendEmail({
      subject: "FATBOY SLIM TICKET AVAILABLE!",
      text: "Go to https://www.moshtix.co.nz/v2/event/fatboy-slim-wellington/142796 to book now!",
      attachments: getScreenshotsAsAttachments(),
    });
    console.log("Fatboy Slim ticket is available!");
  } else {
    await sendEmail({
      subject: "no fatboy slim tickets are available :(",
      text: ":(",
      attachments: getScreenshotsAsAttachments(),
    });
    console.log("No Fatboy Slim ticket are available :(");
  }
});
