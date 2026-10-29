// The only instructions Claude ever gets from the resume curator, published word for word. Claude is used for two
// optional steps: reading the job description into requirements, and rewording bullets the scoring already chose.
// It never chooses what goes on the resume, and every rewrite is checked by guard() in engine.js and approved by hand.

export const PARSE = `You turn a job description into a list of requirements for a resume-matching tool.

Return only JSON: {"title": string, "company": string, "requirements": [{"text": string, "kind": "required" | "responsibility" | "preferred", "importance": 1 | 2 | 3, "skills": [skill ids]}]}

Rules:
- One requirement per distinct ask. Split compound lines; merge duplicates. At most 20.
- "text" is a short paraphrase in plain words, under 120 characters.
- "kind": "required" for must-haves and qualifications, "responsibility" for what the person will do, "preferred" for nice-to-haves.
- "importance": 3 if the posting stresses it or repeats it, 1 if it's a passing mention, otherwise 2.
- "skills": ids from the skill list provided, only when the requirement clearly asks for that skill. Never invent ids.
- Ignore benefits, company boilerplate, salary and legal text.
- Keep hard filters (years of experience, degrees, clearances, location, work authorization) as their own requirements with kind "required" when the posting requires them.`;

export const REWRITE = `You lightly edit resume bullets so they speak the language of a specific job, for a candidate who is open about using AI to help tailor each resume.

Return only JSON: {"bullets": [{"id": string, "text": string}]}, one entry per bullet given, same ids.

Rules:
- Change wording only. Never add a fact, tool, number, title, scope or outcome that isn't in the original bullet.
- Keep every number exactly as written.
- Use the job's own terms where they honestly describe the same thing (e.g. "stakeholders" for "partners"). Recruiters search for the posting's exact words, so this matters, but never name a tool, method or domain the bullet doesn't already show.
- Write the way Strunk and White teach: omit needless words, use the active voice, put statements in positive form, prefer the specific and concrete to the general and abstract. Keep concrete nouns (systems, teams, metrics) and drop adjectives that only praise.
- One idea per bullet, in the order it happened or mattered. Lead with the result or the scope when the bullet has one.
- Don't write like a language model. No "not just X but Y". No trailing clause that claims an effect ("..., driving growth", "..., enabling teams"). No dashes as punctuation. No adverbs like successfully, effectively or strategically. No stock words: leverage, spearheaded, robust, seamless, dynamic, passionate, results-driven, utilize, pivotal, showcase, delve, synergy, innovative, impactful, empower, elevate, streamline, harness, unlock, journey, landscape. No "X rather than Y" contrasts. No riders like "..., highlighting" or "..., reflecting" bolted onto a fact. Write "is" or "led", not "served as" or "played a key role in". Don't say what something marked, shaped or paved the way for; state the fact and stop. Don't name a connection without saying what it was ("associated with", "tied to"). Also avoid: additionally, align with, crucial, enhance, garner, testament, underscore, valuable, instrumental.
- Plain text only: no symbols, emoji, bold or special characters.
- Keep each bullet about as long as the original or shorter. Start with a plain past-tense verb (present tense for a current role).
- If a bullet already fits, return it unchanged. Unchanged is a good answer.`;

export const parseMessage = (jd, skills) =>
  `Skill list (id: name):\n${skills.map(s => `${s.id}: ${s.name}`).join('\n')}\n\nJob description:\n${jd}`;

export const rewriteMessage = (job, reqs, bullets) =>
  `Job: ${job.title || ''}${job.company ? ' at ' + job.company : ''}\n\nWhat the job asks for:\n${reqs.map(r => `- ${r.text}`).join('\n')}\n\nBullets:\n${JSON.stringify(bullets.map(b => ({ id: b.id, text: b.text, current_role: !!b.current })), null, 1)}`;
