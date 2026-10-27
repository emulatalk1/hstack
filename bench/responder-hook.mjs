#!/usr/bin/env bun
// PreToolUse hook for AskUserQuestion: the fixed responder of prereg 9.3. It logs the question as an intervention
// to the file in BENCH_INTERVENTIONS and denies the tool with the fixed answer as the reason.
import { appendFileSync } from 'node:fs'

const input = JSON.parse(await Bun.stdin.text())
const first = input.tool_input?.questions?.[0]?.options?.[0]?.label
appendFileSync(process.env.BENCH_INTERVENTIONS, JSON.stringify({ t: new Date().toISOString(), tool: 'AskUserQuestion' }) + '\n')
const answer = first === undefined ? 'No more information; decide from the requirement.' : `Take the first option: ${first}.`
console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: answer } }))
