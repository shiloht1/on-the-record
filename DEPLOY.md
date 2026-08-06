# Deploying anonymously

Publishing this anonymously is lawful and well-established. Anonymous political
speech is explicitly protected in the United States — *McIntyre v. Ohio
Elections Commission* (1995): "Anonymity is a shield from the tyranny of the
majority." Nothing here needs to be hidden because it is improper; the whole
site is sourced public record.

**Nothing has been deployed.** The build is ready and the artifacts are clean,
but going live is your call and requires an account only you can create.

---

## What is already clean

Verified by scan across all 59 committed files, the database, and git metadata:

| Vector | Status |
|---|---|
| Identifying strings in source, data, or build | none |
| Absolute filesystem paths in `out/` | none |
| Source maps (these normally leak build paths) | not generated |
| `author` / `repository` fields in package.json | absent |
| Metadata inside `surveillance.db` and JSON bundles | none |
| Git commit author and committer | `On the Record <noreply@example.com>` |

The git identity is set **locally on this repo**, so it overrides any global or
system-derived default. Commits will not carry your name or machine username.

Verify it yourself at any time:

```bash
git log --format='%an <%ae>' && git ls-files -z | xargs -0 grep -lI -E "/Users/|your-name-here"
```

---

## What is NOT solved by any of the above

This is the part that actually matters, and no amount of file scrubbing fixes
it. Be honest with yourself about the threat model.

1. **Account creation.** Every host needs an email. Use one created fresh for
   this project — Proton Mail or Tutanota — never an address you have used
   anywhere else. I cannot create accounts for you; that step is yours.
2. **Your IP address.** The host sees it when you upload or push. If that
   matters to you, deploy over a VPN or Tor.
3. **Custom domains deanonymize you.** Registration requires payment and contact
   details. Use the free subdomain the host provides (`something.pages.dev`,
   `something.netlify.app`). If you later want a real domain, buy it with
   privacy protection and a payment method not tied to your name.
4. **How you share the link is the biggest leak.** Posting it from a personal
   social account connects the two instantly and permanently. Nothing on the
   technical side survives that.
5. **Correlation.** Your existing public repos are quant/ML work — a different
   enough domain that topic correlation is weak. Keep it that way: do not star,
   fork, or link this from the account that holds them.
6. **Timing and writing style** are weak signals but real ones at scale.

Anonymity is a practice, not a setting. The files are clean; the rest is
operational discipline.

---

## Deployment options, ranked by how little they expose

### 1. Drag-and-drop upload (recommended)

No git, no CLI, no commit history, no repository — just the finished folder.

**Cloudflare Pages** — <https://pages.cloudflare.com> → *Upload assets*
**Netlify Drop** — <https://app.netlify.com/drop>

Upload the **`out/`** directory. That folder is the complete site: 556 static
pages, self-contained, no server, no database, no build step required on their
end. You get a free subdomain immediately.

This is the recommended path because it publishes the *output* only — the
repository, its history, and its metadata never leave your machine.

To produce a fresh copy of it:

```bash
npm run data:all && npm run build
```

### 2. GitHub Pages on a fresh account

Create a new GitHub account under the project identity, then:

```bash
git remote add origin https://github.com/NEW_ACCOUNT/NEW_REPO.git
```

```bash
git push -u origin main
```

Then enable Pages in the repo settings. Note that a *project* repo serves from
`/REPO_NAME/`, which requires adding `basePath: '/REPO_NAME'` to
`next.config.mjs` and rebuilding. A repo named `ACCOUNT.github.io` serves from
the root and needs no change.

Do **not** push to an account that carries your name. That undoes everything
above in one command.

### 3. Tor hidden service or IPFS

Maximum resistance to both deanonymization and takedown, at the cost of reach.
Worth considering as a mirror rather than the primary, since the audience for
this is ordinary constituents who will not install anything.

---

## Before you publish

- [ ] Fresh email, never used elsewhere
- [ ] Host account created under that email, over a VPN if that matters to you
- [ ] Free subdomain, not a purchased domain
- [ ] `npm run data:all && npm run build` run so the data is current
- [ ] A plan for sharing the link that does not route through a personal account
- [ ] Read `/legal` and `/privacy` on the live site and confirm they describe
      what you are actually doing

---

## One legal point worth repeating

As an **individual publishing this unpaid**, FEC rule 11 CFR 100.94 exempts
uncompensated internet activity — explicitly including "creating, maintaining,
or hosting a Web site" — from counting as a contribution or expenditure. You
have broad latitude.

That exemption does **not** cover paid advertising. The moment you pay to
promote this, different rules apply.

Separately: do **not** incorporate as a 501(c)(3) while the site is framed this
way. Those organisations are absolutely prohibited from intervening for or
against candidates, and this site — worst-first ordering, red marks, drafts
saying a vote cost someone your ballot — would very likely be treated as
prohibited intervention, risking tax-exempt status and excise taxes. If you ever
want charitable status, the content has to become genuinely non-partisan first,
and that is a conversation for a lawyer, not a code change.

None of this is legal advice.
