# BOSA League

The official platform for the BOSA League, BOSA Champions League and BOSA Super League: a premium public site for fans, plus private panels for the League office, team managers (coaches) and referees.

Built with Next.js 14 (App Router), PostgreSQL and Drizzle ORM, Tailwind CSS and Framer Motion. Payments go through Pesapal API 3.0 (MTN MoMo, Airtel Money, Visa, Mastercard).

## What is inside

**Public site**: Home, BOSA League, Champions League (groups and an interactive knockout bracket), Super League (with team registration), Fixtures (filter by competition, club, venue, date and status), match centre pages, Teams, Players, Newsroom, Rules, Membership.

**Accounts and membership**: sign up as a Student fan, Alumni fan or Player (player sign-ups create a registration that the League office approves). A one-time membership (UGX 10,000 by default; the Super Admin can change it) unlocks the full match centre, line-ups, player profiles and members-only stories.

**Control Room** (`/admin`) for Super Admin, League Administrator and Competition Manager:
fixtures and results, the live match console (kick-off, half-time, full-time, goals, assists, cards, substitutions, penalties, line-ups, player of the match, reports), teams, player approvals, injuries and suspensions, competitions, seasons, Champions League groups and knockout draw, Super League applications, newsroom, rules, users and roles, memberships and payments, activity history, CSV exports, venues and settings.

**Club Panel** (`/team-panel`) for each team manager/coach: squad and availability, register new players (sent for approval), submit team sheets, edit the club profile.

**Referee Desk** (`/referee`): each referee sees their appointments and runs the match console for those matches only.

### Points update automatically
League and group tables are calculated from match results every time a page loads. Record a result (or add a goal) and the points, goal difference, form and positions change straight away. Knockout winners move into the next round automatically (penalties included), red cards and every third yellow card suspend the player for their next match, and injuries or suspensions expire on their return date.

## Roles

| Role | Where they go | What they can do |
|---|---|---|
| Super Admin | /admin | Everything, including membership price and assigning any role |
| League Administrator | /admin | Everything except the membership price and creating Super Admins |
| Competition Manager | /admin | Competitions, seasons, fixtures, results, news, rules, exports |
| Team Manager (coach) | /team-panel | Own squad, registrations, availability, team sheets, club profile |
| Referee | /referee | Run the console for matches they are appointed to |
| Player | /account | Own registration and statistics |
| Student Fan / Alumni Fan | /account | Membership and profile |

## Demo accounts (created by the seed)

All use the password in `SEED_PASSWORD` (default `Bosa@2026`). **Change these passwords after your first sign-in, or deactivate the accounts you do not need from Users & roles.**

- superadmin@bosaleague.com: Super Admin
- admin@bosaleague.com: League Administrator
- competitions@bosaleague.com: Competition Manager
- coach.<club-slug>@bosaleague.com: Team Manager for each club, for example coach.alhilal@bosaleague.com, coach.la-masia@bosaleague.com
- referee1@bosaleague.com, referee2@..., referee3@...: Referees
- player@bosaleague.com: Player (Alhilal)
- fan@bosaleague.com: Student fan with an active membership
- alumni@bosaleague.com: Alumni fan without membership

## Seed data

- The 14 registered clubs with the crests from the official Matchday 5 poster.
- Matchday 5 on Sunday 27 September 2026 exactly as published (10:00 Dream Cast v SC M19 through 16:00 Golden Jubilee v HBM at Henry's Pitch, Kabalagala).
- Matchdays 1 to 4 are filled with simulated results so the tables, statistics and profiles have something to show. Player names, campuses, founding years, coaches, previous champions and news stories are **placeholders**: edit them in the Control Room, or clear the simulated results before going live.

## Run it on your computer

Requires Node.js 20+ and PostgreSQL.

```bash
cp .env.example .env        # then edit DATABASE_URL and AUTH_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev                 # http://localhost:3000
```

`npm run db:reset` wipes the database and reseeds it.

## Deploy on Railway

1. Push this folder to a new GitHub repository.
2. In Railway: New Project, Deploy from GitHub repo, pick the repository.
3. Add a PostgreSQL service to the same project, then in the app service's Variables add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `AUTH_SECRET` = a long random string (`openssl rand -base64 48`)
   - `APP_URL` = your public URL, for example `https://bosa-league-production.up.railway.app` (no trailing slash)
   - `SEED_PASSWORD` = the password you want for the demo accounts
   - `PAYMENTS_DEMO_MODE` = `false` in production
4. Deploy. The start command runs the migrations, seeds the database the first time (it skips if data already exists) and starts the site.

## Pesapal

1. Create a merchant account at https://developer.pesapal.com and get your consumer key and secret (sandbox first, then live).
2. Set `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET` and `PESAPAL_ENV` (`sandbox` or `live`) in Railway.
3. That is all: on the first payment the app registers its IPN URL (`APP_URL/api/payments/pesapal/ipn`) with Pesapal automatically. Pesapal sends the payer back to `/membership/callback`, the app confirms the payment with Pesapal and activates the membership. The IPN also activates it if the payer closes the window early.

While no keys are set and `PAYMENTS_DEMO_MODE=true`, the membership button activates without charging, for testing. Admins can also activate a membership by hand from Users & roles (for example after a cash payment).

## Project layout

```
src/app/(site)        public pages
src/app/(auth)        sign in / sign up
src/app/admin         Control Room
src/app/team-panel    Club Panel for team managers
src/app/referee       Referee Desk
src/app/actions       server actions (all permission-checked)
src/app/api           search, CSV exports, Pesapal IPN, sign-out
src/db                schema, migrations runner, seed
src/lib               standings engine, match service, auth, roles, Pesapal client
drizzle/              SQL migrations
public/crests         club crests and the BOSA League logo
```

After changing `src/db/schema.ts`, run `npm run db:generate` to create a new migration.
