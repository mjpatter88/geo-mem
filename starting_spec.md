I want to build a webapp that helps me use spaced repetition to memorize the location of countries and cities around the world.

## Primary Interface
- A globe showing the world, no country boundaries, no labels of any sort.
- It should be scrollable and zoomable and rotateable.
- In order to place a pin, the user must tap/click and hold it down for a second. While holding, show a progress indicator, and when it is full, register the tap/click.
- Each "turn" involves a target location on the globe.
- Once a user has tapped/clicked, that attempt should be scored/evaluated. Provide feedback on: distance from target, right/wrong country, etc.

## Countries Mode
- In this mode, the goal is to correctly locate countries on the globe.
- A tap/click inside the borders of a country receives a full score (100). A tap outside, receives a score based on the distance from that tap to the nearest point within a country.
- The ultimate goal is to be able to locate every single country correctly.

## Cities Mode
- In this mode, the goal is to correctly locate cities on the globe.
- A tap/click inside the borders of a city receives a full score (100). A tap outside, receives a score based on the distance from that tap to the nearest point within a city.
- If city boundaries are not available, just use a tap/click within 10 miles of the city location as perfect.
- The set of cities should include the capitals of each country as well as other major cities. For example, the cities in the USA should include state capitals and populator centers. It can be a dynamic list that grows over time as I may want to specifically add/remove a city.
- The goal is not to locate every single city in the world, that would be impossible. Instead, I want to be able to locate every major city.

## Continent/Country Mode
- In this mode, I can pick to practice all countries in a given continent or all cities in a given country. It is just a way to narrow down the set of items being practiced.

## Daily Practice Mode
- Give me a small set of cities to practice based on the relative importance of a city and based on my performance in locating that city in the past.


## Requirements
- We'll need to store all of my past attempts along with a score and date/time. I want to be able to measure progress over time as well as identify specific weak points.
- I want this practice to all be driven by spaced repetition principles so I get better at memorizing city locations over time.
- Let's start with the most important cities.
- I also want a stats/profile page with relevant charts and tables.


## Tech Stack
- Roughly speaking, I'd like to use angular and firebase as I'm familiar with those.
- I'm hoping this can just be frontend+database, but let me know if I need server code as well. I'm comfortable with Python for that.
- I don't care too much about the style of the website, but I want it to be practical and easy to use on both mobile and desktop.
- We can use firebase auth with a gmail email for login/authentication/etc.

## Approach
- I want to build this app together. I don't want you to go off and write all the code, I want you to guide and teach me how to build it.
- Break it down into various steps with intermediate validation.
- Don't write code yourself, just give me instructions with context and let me implement.
- I'll ask questions if I have them. Once I've completed the step, I'll tell you and you can look at the code and provide any feedback.
- I want to learn how to build this app myself, not just have you do it for me.
- Before we start, I want you to put together a high level plan. What technolgies (hopefully firebase and angular, but tell me if others are a better fit)? What map/globe provider? etc. etc.  Ask me any questions to get clarity.
- Save the plan in this directory as an implementation plan, probably in markdown format.