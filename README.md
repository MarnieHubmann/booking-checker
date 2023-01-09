# drivers-licence-booking

Checks Waka Kotahi NZTA practical drivers licence bookings and rebooks them to an earlier date if possible.

## Requirements

Node 16 and Yarn are required

## Local Setup

Make a copy of `.env.dist` and name it `.env`
In `.env`, set the values to be the details of the driver you wish to make bookings on behalf of.

To install depedencies:

```sh
yarn && npx playwright install --with-deps
```

To run it locally:

```sh
npx playwright test drivers-test.spec.ts
```

## Scheduling

You can clone this repo on a server and follow the setup instructions, and then add the following entry to your crontab:

```sh

```
