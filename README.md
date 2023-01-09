# drivers-licence-booking

Checks Waka Kotahi NZTA practical drivers licence bookings and rebooks them to an earlier date if possible.

## Local Setup

Make a copy of `.env.dist` and name it `.env`
In `.env`, set the values to be the details of the driver you wish to make bookings on behalf of.

To run it locally:

```sh
npx playwright test drivers-test.spec.ts
```
