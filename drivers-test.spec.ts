import { test } from "@playwright/test";
import * as dotenv from "dotenv";
import { isBefore, isToday, parse } from "date-fns";

test("check drivers licence test slots and change it if there is an earlier spot available", async ({
  page,
}) => {
  dotenv.config();
  if (!process.env?.LICENCE_NUMBER) {
    throw new Error("Please set the LICENCE_NUMBER environment variable or value in .env");
  }
  if (!process.env?.LICENCE_VERSION) {
    throw new Error("Please set the LICENCE_VERSION environment variable or value in .env");
  }
  if (!process.env?.LAST_NAME) {
    throw new Error("Please set the LAST_NAME environment variable or value in .env");
  }
  if (!process.env?.DATE_OF_BIRTH) {
    throw new Error("Please set the DATE_OF_BIRTH environment variable or value in .env");
  }

  // Visit NZTA test bookings portal
  await page.goto("https://online.nzta.govt.nz/licence-test/");
  await page.click('button:text("Get started")');

  // Fill in drivers licence details and login
  await page.type(
    'input[formcontrolname="LicenceNumber"]',
    process.env.LICENCE_NUMBER
  );
  await page.type(
    'input[formcontrolname="LicenceVersion"]',
    process.env.LICENCE_VERSION
  );
  await page.type('input[formcontrolname="LastName"]', process.env.LAST_NAME);
  await page.type(
    'input[formcontrolname="DateOfBirth"]',
    process.env.DATE_OF_BIRTH
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
  await page.click('button:text("Reschedule")');

  // Select the Thordon test site
  await page.click('a:text("Wellington")');
  await page.click('li:not(.activeLink) a:text("Wellington")');
  await page.click('a:text("VTNZ Thorndon")');
  await page.waitForTimeout(3000);

  // Find the next soonest available booking
  let newDateText = await page.locator(".dateText").first().innerText();
  while (!newDateText.length) {
    await page.click("a.ui-datepicker-next");
    await page.waitForTimeout(3000);
    newDateText = await page.locator(".dateText").first().innerText();
  }
  const newDate = parse(newDateText, "EEEE d MMMM y", new Date());

  if (
    isBefore(newDate, currentBookingDate) &&
    !isToday(newDate) &&
    !isBefore(newDate, new Date())
  ) {
    // There is a new booking time - rebook it
    await page.locator("input").first().click();
    await page.waitForTimeout(3000);
    await page.click('button:text("Continue")');

    // Confirmation page - confirm the booking change!
    await page.waitForTimeout(5000);
    await page.click('button:text("Continue")');

    await page.screenshot({ path: "screenshots/changed-booking.png", fullPage: true });
    console.log("Successfully rebooked test for " + newDateText);
  } else {
    // Nothing sooner is available so just log out
    await page.screenshot({ path: "screenshots/no-bookings-available.png", fullPage: true });
    await page.click('a:text("(Log out)")');
    console.log("No sooner bookings were available :(");
    test.fail(true, "No sooner bookings were available :(");
  }
});
