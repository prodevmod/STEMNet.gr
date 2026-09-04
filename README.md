# STEMNet.gr — V1

## For Reviewers (Important)

Before reviewing the project, please create an account and test the logged-in experience.

- If you don’t want to use personal info, use a temporary email generator.
- Verify the account through the inbox link.
- Please test core authenticated flows: posting, replying, groups, notifications, profile links, and settings.

## If YOU HATE BEING JOLLY AND U ARE SCARED I AM GONNA STILL YOUR DATA REVIEW THE VID IG
[![Watch the Video][https://youtu.be/_8i4aKSSZo](https://youtu.be/_8i4aKSSZo8)]

Most of the work and platform value is in the authenticated part of STEMNet, so testing only the public view won’t reflect the real product.

<img width="1895" height="1005" alt="image" src="https://github.com/user-attachments/assets/7411cc41-4fd3-4239-8abf-cfa13a3ea384" />

Hi, I’m **prodevmod** — a student developer from Greece, and I built this as my **CS50 final project**.  
Not just to finish the course, but to solve a real problem: in Greece, access to STEM clubs, robotics culture, and even electronic components can be very limited for students.

That’s why I made **STEMNet.gr**: a platform where students can learn in public, find collaborators, share projects, ask for help, and discover STEM opportunities.

<img width="792" height="1013" alt="image" src="https://github.com/user-attachments/assets/2396bc0f-a341-4a11-a019-1e0d060a81f7" />

## Why this project exists
STEMNet is for students who are motivated but under-supported.  
My vision is simple: give young builders one place to connect, create, and grow — first in Greece, then globally.

## 🤮 OLD framework (MVP)
**Frontend:** HTML + CSS  
**Backend:** Flask (Python)  
**Database:** SQLite (local compatibility)

<img width="270" height="480" alt="DisappointedManGIF" src="https://github.com/user-attachments/assets/c0d4e0b4-b24a-4ea8-893e-2f9120a6ab0c" />

<img width="1878" height="1015" alt="image" src="https://github.com/user-attachments/assets/7b18a8fe-cc21-4929-b079-e197a605cebc" />

## Current framework (V1)
**Frontend:** React + JavaScript + CSS  
**Backend:** Flask (Python)  
**Database:** PostgreSQL (production), SQLite (local compatibility)

<img width="1875" height="1019" alt="image" src="https://github.com/user-attachments/assets/f84df3b3-30ba-4def-8a4f-117931423e82" />

### Key system points
- Full auth flow: register/login/logout + verification tokens
- reCAPTCHA protection and SQL-injection-safe query patterns
- Posts, replies, likes, groups, profile links, events
- Notifications system with unread indicator logic
- Search endpoints + pagination utilities
- URL/domain blocklist moderation
- Media validation + image resize pipeline
- Soft-delete for posts with replies (thread integrity)
- Settings foundation: appearance, account actions, email/password flows (in progress)

<img width="1869" height="1001" alt="image" src="https://github.com/user-attachments/assets/7f0fec5b-3fd6-44b6-a363-03e4742eb5e4" />

## What I learned
- Real software is about user flows, not isolated pages.
- Small route/method mismatches can cost hours (and teach discipline).
- Notifications require both schema design and clean frontend state wiring.
- Security is layered: verification, sanitization, anti-bot, rate control mindset.
- Shipping fast matters, but maintainable structure matters more.

<img width="1873" height="993" alt="image" src="https://github.com/user-attachments/assets/52da582e-4d58-414e-a805-c8a38c1c1218" />

## Next steps
- Close all the ISSUES place by viewers and testers

<img width="1880" height="1011" alt="image" src="https://github.com/user-attachments/assets/71cdf3f3-4053-47b6-a50e-57e4905c2c21" />

## Contributions & License
Pull requests are welcome after issue discussion for major changes.  
Copyright (c) 2026 prodevmod. All rights reserved.  
Proprietary project; contributions are for this repository only.

<img width="1861" height="1007" alt="image" src="https://github.com/user-attachments/assets/fb348c6f-9089-4136-9e10-544c3e2ca3d9" />

## Closing
If you test my app, please test logged-in features deeply and suggest ideas via GitHub Issues:  
https://github.com/prodevmod/STEMNet.gr/issues
