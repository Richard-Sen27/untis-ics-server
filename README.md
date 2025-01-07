# Untis ICS Calender Generator

![License: Personal Use Only](https://img.shields.io/badge/license-personal--use--only-red)

## About

I created this project just for fun, as some of my friends mentioned it would be nice to have the school data from WebUntis in the personal calendar. So I simply started and here we are. Please note that this is a fun project and it is very likely here are some bugs hidden. If you find some, do not hesitate to create an issue or contact me.

## The Generator

Open [Untis Calendar Generator](https://untis-ics-server.onrender.com) to get your own access. Your data is only used to generate your own token (the long giberish in the output url). Please mention that downtime of the server may occur, as it is a free tier of [Render.com](https://render.com). If you want to use it and it is not available, just wait for a few second and the Server will be back soon.

## How it works

The core of this application is in the backend, a simple Express.js server. The personal information is passed from the frontend to the backend via `POST /encrypt`. This endpoint returns the token and is being displayed in the browser. The actual magic happens at `GET /calendar.ics?from=YYYY-MM-DD&to=YYYY-MM-DD&token=here-your-token`.

## Application in your own Calendar

This depends on your system and the used calendar software. All common calendars suport `Calendar Subscriptions`. Just copy the URL from the genrator and paste it to the required input and you are done.