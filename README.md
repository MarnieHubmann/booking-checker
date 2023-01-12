# bookings-checker

Checks a website that takes bookings and notifies you via email if there is a booking available.

## Requirements

Node 16 and Yarn are required

## Local Setup

Make a copy of `.env.dist` and name it `.env`
In `.env`, set the values to be the details for the gmail account you wish to send email notifications from.

To install depedencies:

```sh
yarn && npx playwright install --with-deps
```

To run it locally:

```sh
yarn playwright test
```

## Scheduling

You can clone this repo on a server and follow the setup instructions, and then add the following entry to your crontab:

```sh
*/5 * * * * /Users/mark/Documents/bookings-checker/node_modules/.bin/playwright test
```
(Replace `/Users/mark/Documents/bookings-checker` with the actual path of this repository)