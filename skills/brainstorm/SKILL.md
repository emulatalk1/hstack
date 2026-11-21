---
name: brainstorm
description: Step 1 of the hstack build loop - the brainstorm with the user that ends in the spec. Invoked by hstack:build at its step 1 and by nothing else. For any request to build, change or fix code, invoke hstack:build, not this.
---

# Brainstorming

You are very good at building. You build what you believe your human
partner wants, and that belief is usually thinner than it feels. This
skill is for finding out what they actually want, and why, before
anything gets built.

People often haven't finished working out what they want. Good questions
help them think it through. When you understand the why, you make the
hundred decisions they never mention the way they would have made them.

## In hstack

You are here from step 1 of `hstack:build`, at its item "Brainstorm". If that is not so, do nothing here and invoke `hstack:build`, which sends you back here at the right moment. Invoked by the user themselves, it is the start of a build: `hstack:build` takes their request from its step 1.

This is the conversation before the spec. The text below is followed as it stands; what hstack adds to it:

- **The written design of this skill is the spec of the build loop.** It is one file, in the form the playbook's step 1 gives, and your human partner approves it there. There is no second document beside it and no plan after it: after the approval the loop runs to its end alone.
- **Your first message always comes,** in every session, however plain the request looks. Their answer to it decides whether you write the spec at once or the conversation goes on. Do not guess whether a person is there.
- **Only what was discussed and agreed is written.** A question that comes up later, the second reader's too, goes to your human partner first; its answer is written after it is given.
- **Nothing in the repository changes before the spec is approved,** and no command of the loop's script runs during the conversation but `dir`: the loop's stop hook would hold such a turn. A spike is built outside the repository, and mock-ups live in the loop's state folder.
- **Looking includes the project's records:** the list of features and their steps, the coverage file, the log, earlier specs and the decisions files beside them. A place where the request goes against one of them is raised in the conversation, not first written into the spec.

## First: What Do You Actually Know?

Before you reply, ask yourself: what do I know about what they want, and
why?

- **Everything that matters is in the request** ("make the icon cornflower
  blue"). Even then, send your first message before the spec: what you
  understood and what you found. Their answer to it decides: write the
  spec at once, or go on with the conversation.
- **Something non-trivial is missing.** Start the conversation.

Before anything is built, you must, in order:

1. Lay out the approaches in a message of their own, and have your
   human partner pick one (see Lay out the approaches).
2. Write the spec, short or full (see Size the Work).
3. Get their approval of the spec.
4. Go on with step 2 of the playbook.

If nothing is open when you write your first message and there's one
sensible way, step 1 happens in that message (see Your First Message);
the spec is still written and approved after their answer.

One thing isn't building: a spike they said yes to (see Spike to feel
things out). Opting out of the questions takes them to the spec sooner;
it does not take the spec away.

## Look Before You Ask

In an existing project, or when they've given you context (a spec, a plan,
a handoff, files they pointed at, earlier conversation), dig in before your
first message. Read what they referred to and the code or material it
connects to, and keep reading until you can explain how the relevant
parts work today and what this change would touch. Never ask what the
project or their context already answers, or reopen what they've
already decided. In hstack, read the project's records too (see In
hstack): what they hold is context your human partner has given you.

## Your First Message

Move the work forward, with one of these:

- **They've already said what they want** (a spec, a plan, a detailed
  request): aim for about 200 words for the whole message. Echo their
  request back in your own words, so they can see whether you've got its
  shape: what they want, who it's for, and why, as far as they've said.
  Add what you found that bears on it: how the relevant parts work today
  and what the change would touch. If you found something they may not
  have considered that would change what they're asking for or how it
  has to be built, like a constraint, a conflict, or a cheaper path, say
  so plainly. How to build it comes later, once you understand what they
  want (see Lay out the approaches). End with one line inviting
  corrections. Then, if they haven't told you why they want it, even if
  you can guess, ask about that: one open question in their own terms,
  with nothing to pick from. If they have told you, and their request
  and the project leave open something whose answer would change what
  gets built, ask about the one that would change it most; when its
  choices can be named, sketch each concretely, with what it trades off
  and which you'd pick. If nothing like that is open, there's one
  sensible way: end with the short design itself (the approach, a line on
  why the others don't fit, and the design in a few lines) and ask them
  whether that is right. Their yes covers the approach and the design:
  write the spec from it and hand it over for the approval.
  Specs are often incomplete, so confirm before you build on one.
- **They haven't:** one open question, in their own terms, about the
  biggest thing their request leaves unsettled. Say why you're asking:
  what the answer would change about what you build. For "a website for
  my bakery": "If it's mostly for people deciding whether to stop by,
  I'd lead with hours and what's in the case today; taking orders is a
  different site. What do you want someone to do when they land on it?"

How the message ends depends on whether their message asked for
brainstorming:

- **They asked for it** (by name, by invoking it, or by asking for a
  design discussion): end there. They want this conversation.
- **They didn't:** they may not want a conversation at all. End with a
  light, one-line offer to just get going instead, like
  "Or if you'd rather I just write the spec, say so." If they take you up
  on it, the conversation is done: state any significant how-it-gets-made
  choice (platform, language, medium) in one plain line, then write the
  spec and hand it over for the approval.

That's the whole message.

## The Conversation

Ask a question only when the answer would change what gets built and
neither the request nor the project answers it. Otherwise, state your
call and your reason as a proposal they can correct, and move the work
forward. Process steps are always your calls: writing things up, where
files go, looking further, how to show something. Do them and say so.
Ask one at a time. Use plain language, pitched just a little above where
your human partner is. Match their vocabulary; never use process jargon.
You never need to quote this skill to your human partner.

Be clear and concise. Lead with what matters. Avoid jargon. When you
report what you found, give them the most important findings and offer
the rest.

**Get them describing.** Until you know why they want it, ask open
questions, with no example answers attached. Their own words carry
intent that your options can't. Once you know why, when a decision has
choices you can name, sketch each concretely, with what it trades off
and which you'd pick. When they say "just guess" or "what do you think?",
propose something concrete.

**How it gets made.** Every project rests on choices about medium, tools,
materials, and resources: the platform, programming language, and
libraries for an app; the medium for a piece of art. Read from how they
talk which of those choices they want to make. Someone who raises the how
or asks about trade-offs wants the options with your pick. Someone who
talks about outcomes is handing you the how: make those calls and state
each in a line. When there's existing work, build on what it already
uses. Any choice you make goes in the design as your call, never as
something they agreed to.

**Ground to cover.** This is territory, not a script. Never read these
out as questions:

- what kind of thing this is, and what makes it special
- why now, and what success looks like to them
- goals, non-goals, and anti-goals (what would make this a failure even
  if it technically works)
- prior art: what they've seen elsewhere, loved or hated
- current state: what exists now, what they've tried
- the details they care about

**Make every question specific** to their project and what they've told
you. Ask Socratically, the way a sharp colleague would: build each
question on their last answer or on something you found, so it helps
them think through a consequence or a case they may have missed
("Voting closes before the meeting, and two members joined this month.
Does someone who joins mid-round get a vote?"). When the reason isn't
already plain, say what you're hoping to learn or what the answer would
change. A proposal they can correct, plus your reason for it, often
beats a question.

**Do recon.** Once you have a bit of grounding and looking further
would help, go look: deeper into their codebase or project, their own
files and data, or the web. Say what you looked for and what you found.

**Lay out the approaches.** Once you understand what they want, and
before you write anything up, put the ways of building it in a message
of its own. Come up with several real alternatives and drop the weak
ones, including any that work against why they want it and any the
existing work rules out. Sketch the two or three that remain concretely
enough to picture, grounded in what the project actually does, with what
each trades off. Recommend one and say why, then ask which way they want
to go; if they've handed you the how, say you'll go with your pick
instead. When there's genuinely one sensible way, say so in that
message and explain why the others don't fit; the design comes in the
next one. This is for how it gets built; for what they want, get them
describing first.

**Show, don't tell.** Whenever seeing would help more than reading,
sketch it in text: a few lines of what they'd see. Offer the visual
companion (below) when the look itself is theirs to decide:

- something they'll look at: a screen, a page, a printout, a sign
- a layout or arrangement: of a screen, a room, a schedule
- a flow or a sequence of steps
- options that would look different from each other
- a structure that's easier to see than read: a diagram, a timeline, a map

Once they've accepted, use it for mockups to react to, side-by-side
options, and throwaway prototypes they can click.

**Spike to feel things out.** Agentic work is waterfall, but very, very
fast. A quick throwaway build is often the cheapest way to learn what
they want or whether something works. Offer one when it would help.
When they just want to spike, get out of the way. Spikes get no tests
or minimal ones, aren't bulletproof, and skip the plan, implementation,
and review process. Bring what the spike taught you back into the
conversation. Build a spike in a scratch folder outside the repository:
before the spec is approved, nothing in the repository changes.

## Play It Back

Play back as you go. As soon as you understand one part well enough to
describe it (what it's for and who it serves, say, or how one piece
behaves), describe that part back in about 200-300 words, then return to
questions about the next part. Playback and questions alternate through
the whole conversation; the last chunk covers whatever is left.

Only what they said goes in as theirs. Anything you filled in goes in
as your proposal, with your reason. End each chunk by asking what's wrong
or missing.

Before you send a chunk, check it: does it describe something they'll
look at, like a page, a screen, a schedule, or a printout? If so, put a
text sketch next to the description. If the look itself is theirs to
decide and they haven't seen the visual companion offer yet, send the
offer instead (its own message, below) and hold the chunk for the next
message. Once they've accepted, put a mockup next to the description.

## Size the Work

Once you understand what they want and they've picked an approach, say
how big the work is in plain words. They can override it.

| Size | The spec |
|------|----------|
| A small change | a short one: what you already covered together, written down; it goes to your human partner without the builder check |
| A project | the full spec (below), read by a second agent first |

Short or full, the spec's section "Agreed in the brainstorm" has an
**Approaches** part: the two or three ways you considered building it,
what each trades off, which one they picked, and why. They pick in the
conversation, before you write the spec.

If it grows mid-task, stop, say so, and step up a size.

If this is really several independent projects, say so, agree on an
order, and brainstorm them one at a time.

## The Written Spec

Write a plain document a talented builder in the domain could build
from without going back to your human partner. Its section "Agreed in
the brainstorm" covers:

- intent and the why
- goals, non-goals, anti-goals
- constraints
- approaches (above)
- the parts of the how they decided, as they decided them
- what's left to the builder

Its behaviours are what the conversation agreed the thing does, each one
sentence that a user can check. Write into the spec only what was
discussed and agreed: what you filled in yourself is put to your human
partner first.

For a small change, the short spec covers the same points in a line
or two each and goes straight to your human partner, without the
builder check.

**Where it goes:** The playbook's step 1 says where the spec goes and
what else it holds. Go back to it now, to its item "Start", and write
the file as its item "The spec file" says.

**Builder check** (for a project): dispatch a fresh subagent with
`builder-check-prompt.md` in this directory. When you tell your human
partner you're writing it up, say a reviewer will read it first and you
may come back once with a few questions. Don't hand over the spec
until the check is back. Sort what the builder asks into three piles:

- **Answered already** by the conversation or the project: put the answer
  in the spec.
- **Minor:** a sensible builder could settle it without changing what gets
  built. Settle it yourself and name it in the spec under what is left to
  the builder.
- **Theirs:** only your human partner can answer it, and the answer changes
  what gets built.

Bring the "theirs" pile to your human partner in a message of its own,
before you hand the spec over, most important first; run `$H spec <file>`
before that message, so that the turn can end while they answer. Write
an answer into the spec only when they have given it, then hand the spec
over with a short list of the calls you made so they can check those
while reading. That's the only round of questions the check produces.
Without a subagent tool, read the spec as that builder yourself.

<HARD-GATE>
Nothing gets built until your human partner approves the spec:
the short one for a small change, the full one for a project.
Building includes writing product code, scaffolding, installing
dependencies, creating projects, and invoking an implementation skill.
Reading and exploring are fine.

One exception. A spike they said yes to may be built, outside the
repository; it stays labeled throwaway, and keeping what it produced is
a new request that comes back through this gate. If they opted out of
the questions, the conversation is done, and the spec is still approved
before anything is built.

After the spec is approved, go on with step 2 of the playbook and no
other skill.
</HARD-GATE>

## Red Flags

| Thought | Reality |
|---------|---------|
| "I'll offer a menu of what they might want" | Options steer. Ask them to describe it first. |
| "I'll fill in sensible defaults" | Good. Say them out loud. A default they never heard is one they couldn't reject. |
| "I've answered their questions, so I'll write the doc" | Lay out the approaches first, in a message of their own (or, when nothing was open from the start, in your first message's short design). |
| "I should explain the process first" | Ask your question. The process shows itself. |
| "They said 'sounds good' to the idea" | Approval covers what you showed them. A spec you haven't written isn't approved. |
| "The spike works, I'll keep building on it" | Keeping it is a new request. Back through the gate. |

## Visual Companion

A browser tab for showing mockups, diagrams, and prototypes. It's a
tool, not a mode: accepting it doesn't send every question to the
browser.

**Offer it just-in-time.** Offer it the first time one of the moments
above comes up, never upfront. The offer is its own message with nothing
else in it:

> "This might be easier if I show you. Want me to open a browser tab with some mockups?"

If they decline, stay in text and don't offer again unless they raise it.

**Per question, ask: would they understand this better by seeing it?**
Mockups, layouts, diagrams, and side-by-side designs go in the browser.
Requirements, scope, tradeoffs, and conceptual choices stay in text. A
question about a UI topic isn't automatically a visual question.

If they accept, read `visual-companion.md` in this directory before
starting the server.
