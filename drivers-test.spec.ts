import { Page, test } from "@playwright/test";
import { isBefore, isToday, parse } from "date-fns";
import { readdirSync, rmSync } from "fs";
import nodemailer, { SentMessageInfo } from "nodemailer";
import smtpTransport from "nodemailer-smtp-transport";
import { Attachment } from "nodemailer/lib/mailer";

function getLicenceDetails() {
  if (!process.env?.LICENCE_NUMBER) {
    throw new Error(
      "Please set the LICENCE_NUMBER environment variable or value in .env"
    );
  }
  if (!process.env?.LICENCE_VERSION) {
    throw new Error(
      "Please set the LICENCE_VERSION environment variable or value in .env"
    );
  }
  if (!process.env?.LAST_NAME) {
    throw new Error(
      "Please set the LAST_NAME environment variable or value in .env"
    );
  }
  if (!process.env?.DATE_OF_BIRTH) {
    throw new Error(
      "Please set the DATE_OF_BIRTH environment variable or value in .env"
    );
  }
  return {
    licenceNumber: process.env.LICENCE_NUMBER,
    licenceVersion: process.env.LICENCE_VERSION,
    lastName: process.env.LAST_NAME,
    dateOfBirth: process.env.DATE_OF_BIRTH,
  };
}

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
  }): Promise<SentMessageInfo> =>
    transporter.sendMail({
      from: process.env.GMAIL_FROM,
      to: process.env.GMAIL_TO,
      subject,
      text,
      attachments,
    });
}

async function checkIfSlotIsAppropriate(
  page: Page,
  currentBookingDate: Date
): Promise<boolean> {
  let newDateText = await page.locator(".dateText").first().innerText();
  if (!newDateText) {
    console.log("Couldn't find date on this page");
  }
  let newDate = parse(newDateText, "EEEE d MMMM y", new Date());
  if (isToday(newDate)) {
    console.log("Found a booking that is today, but that is too soon", newDate);
    return false;
  }
  if (!isBefore(newDate, currentBookingDate)) {
    console.log("Selected booking date is after the current booking", newDate);
    return false;
  }
  if (!isBefore(newDate, new Date())) {
    console.log("Selected booking date is too soon/in the past", newDate);
    return false;
  }
  return true;
}

async function selectNextBooking(page: Page, currentBookingDate: Date) {
  let screenshotsTaken = 0;

  // Look at the first available booking on the first page
  let result = await checkIfSlotIsAppropriate(page, currentBookingDate);
  await page.screenshot({
    path: `${__dirname}/screenshots/bookings-page-${++screenshotsTaken}.png`,
    fullPage: true,
  });
  if (result) {
    return true;
  }

  // Look at the next available booking on the first page
  if (
    (
      await page
        .locator("td:not(.ui-state-disabled):not(.ui-datepicker-current-day)")
        .all()
    ).length
  ) {
    await page
      .locator("td:not(.ui-state-disabled):not(.ui-datepicker-current-day)")
      .first()
      .click();
    await page.waitForTimeout(3000);
    let result = await checkIfSlotIsAppropriate(page, currentBookingDate);
    await page.screenshot({
      path: `${__dirname}/screenshots/bookings-page-${++screenshotsTaken}.png`,
      fullPage: true,
    });
    if (result) {
      return true;
    }
  }

  // Go to the next month and see if anything is available
  await page.click("a.ui-datepicker-next");
  await page.waitForTimeout(3000);
  result = await checkIfSlotIsAppropriate(page, currentBookingDate);
  await page.screenshot({
    path: `${__dirname}/screenshots/bookings-page-${++screenshotsTaken}.png`,
    fullPage: true,
  });
  return result;
}

function getScreenshotsAsAttachments(): Attachment[] {
  return readdirSync(__dirname + "/screenshots").map((file) => ({
    path: __dirname + "/screenshots/" + file,
    filename: file,
  }));
}

test("check drivers licence test slots and change it if there is an earlier spot available", async ({
  page,
}) => {
  rmSync(__dirname + "/screenshots", { recursive: true, force: true });
  const licenceDetails = getLicenceDetails();
  const sendEmail = setupEmailer();

  // Visit NZTA test bookings portal
  await page.goto("https://online.nzta.govt.nz/licence-test/");
  await page.click('button:text("Get started")');

  // Fill in drivers licence details and login
  await page.type(
    'input[formcontrolname="LicenceNumber"]',
    licenceDetails.licenceNumber
  );
  await page.type(
    'input[formcontrolname="LicenceVersion"]',
    licenceDetails.licenceVersion
  );
  await page.type('input[formcontrolname="LastName"]', licenceDetails.lastName);
  await page.type(
    'input[formcontrolname="DateOfBirth"]',
    licenceDetails.dateOfBirth
  );
  await page.click('button:text("Login")');

  // Reschedule existing booking
  await page.waitForURL(
    "https://online.nzta.govt.nz/licence-test/booking/eligibility"
  );
  const currentBookingDateText = await page.locator("dd").first().innerText();
  const currentBookingDate = parse(
    currentBookingDateText,
    "EEEE d MMMM y, h:m aa",
    new Date()
  );
  await page.screenshot({
    path: __dirname + "/screenshots/current-booking.png",
    fullPage: true,
  });
  await page.click('button:text("Reschedule")');

  // Select the Thordon test site
  await page.click('a:text("Wellington")');
  await page.click('li:not(.activeLink) a:text("Wellington")');
  await page.click('a:text("VTNZ Thorndon")');
  await page.waitForTimeout(3000);

  // Find the next soonest available booking
  const foundNewBooking = await selectNextBooking(page, currentBookingDate);

  if (foundNewBooking) {
    // There is a new booking time - rebook it
    await page.locator("input").first().click();
    await page.waitForTimeout(3000);
    await page.click('button:text("Continue")');

    // Confirmation page - confirm the booking change!
    await page.waitForTimeout(5000);
    await page.click('button:text("Continue")');

    await page.screenshot({
      path: __dirname + "/screenshots/new-booking.png",
      fullPage: true,
    });
    await sendEmail({
      subject: "Drivers Licence Booking: REBOOKED!",
      text: "Successfully rebooked test!",
      attachments: getScreenshotsAsAttachments(),
    });
    console.log("Successfully rebooked test!");
  } else {
    // Nothing sooner is available so just log out
    await page.click('a:text("(Log out)")');
    await sendEmail({
      subject: "Drivers Licence Booking: No bookings available",
      text: "No sooner bookings were available :(",
      attachments: getScreenshotsAsAttachments(),
    });
    console.log("No sooner bookings were available :(");
  }
});
